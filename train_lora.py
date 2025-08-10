#!/usr/bin/env python3
"""
LoRA Fine-tuning Script for KeyForge Typing AI

Dependencies (install first):
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install transformers peft bitsandbytes datasets accelerate tqdm
"""

import argparse
import json
import os
import sys
from pathlib import Path

import torch
from datasets import load_dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments,
    Trainer,
    DataCollatorForLanguageModeling
)
from peft import LoraConfig, get_peft_model
from tqdm import tqdm

# Configuration
BASE_MODEL = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
DATA_FILE = "data/typing_dataset.jsonl"
OUTPUT_DIR = "models/keyforge-lora"
MICRO_BATCH = 2
GRAD_ACCUM = 16
MAX_STEPS = 300
TEST_STEPS = 100
LEARNING_RATE = 2e-4
TARGET_MODULES = ["q_proj", "v_proj"]
LORA_R = 16
LORA_ALPHA = 32
LORA_DROPOUT = 0.1
MAX_LENGTH = 512

def resolve_device(device_arg):
    """Resolve device configuration based on argument and availability"""
    want_cuda = (device_arg == "cuda") or (device_arg == "auto" and torch.cuda.is_available())
    
    if want_cuda:
        if torch.cuda.is_available():
            device_map = {"": "cuda:0"}
            use_8bit = False  # Force full precision for better stability
            precision_args = {"fp16": True}
            device_name = torch.cuda.get_device_name()
            print(f"🚀 Loading on device: cuda ({device_name})")
        else:
            print("⚠️  CUDA requested but not available, falling back to CPU")
            device_map = {"": "cpu"}
            use_8bit = False
            precision_args = {"bf16": True}
            print("🚀 Loading TinyLlama-1.1B on CPU (full precision)")
    else:
        device_map = {"": "cpu"}
        use_8bit = False
        precision_args = {"bf16": True}
        print("🚀 Loading TinyLlama-1.1B on CPU (full precision)")
    
    return device_map, use_8bit, precision_args

def prepare_dataset(tokenizer):
    """Load and tokenize the typing dataset"""
    print(f"📂 Loading dataset from {DATA_FILE}")
    
    if not os.path.exists(DATA_FILE):
        raise FileNotFoundError(f"Dataset not found: {DATA_FILE}")
    
    # Load dataset
    dataset = load_dataset("json", data_files=DATA_FILE, split="train")
    print(f"📊 Loaded {len(dataset)} examples")
    
    def format_example(example):
        """Format instruction + response as training text"""
        instruction = example["instruction"]
        response = json.dumps(example["response"])
        return {"text": f"{instruction}\n{response}"}
    
    def tokenize_function(examples):
        """Tokenize the formatted text"""
        return tokenizer(
            examples["text"],
            truncation=True,
            max_length=MAX_LENGTH,
            padding=False,
            return_tensors=None
        )
    
    # Format and tokenize
    formatted_dataset = dataset.map(format_example, remove_columns=dataset.column_names)
    tokenized_dataset = formatted_dataset.map(
        tokenize_function,
        batched=True,
        remove_columns=formatted_dataset.column_names
    )
    
    print(f"✅ Dataset prepared: {len(tokenized_dataset)} tokenized examples")
    return tokenized_dataset

def setup_model_and_tokenizer(base_model, device_map, use_8bit):
    """Initialize model and tokenizer with LoRA"""
    print(f"🤖 Loading base model: {base_model}")
    
    # Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained(base_model)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    
    # Prepare model loading arguments
    model_kwargs = {
        "device_map": device_map,
        "load_in_8bit": use_8bit,
    }
    
    # Add torch_dtype only for GPU loading
    if use_8bit:
        model_kwargs["torch_dtype"] = torch.float16
    
    # Load model
    model = AutoModelForCausalLM.from_pretrained(base_model, **model_kwargs)
    
    # Setup LoRA configuration
    lora_config = LoraConfig(
        r=LORA_R,
        lora_alpha=LORA_ALPHA,
        target_modules=TARGET_MODULES,
        lora_dropout=LORA_DROPOUT,
        bias="none",
        task_type="CAUSAL_LM"
    )
    
    # Apply LoRA to model
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()
    
    return model, tokenizer

def train_model(model, tokenizer, dataset, device_map, precision_args, max_steps, is_test=False):
    """Train the LoRA model"""
    
    # Determine run name and output directory
    run_name = "keyforge-test" if is_test else "keyforge-lora"
    
    # Adjust output directory for test runs
    output_dir = f"{OUTPUT_DIR}-test" if is_test else OUTPUT_DIR
    
    print(f"🚀 Starting {'test' if is_test else 'full'} training: {max_steps} steps")
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # Adjust precision for CPU training
    if device_map == {"": "cpu"}:
        # Disable fp16/bf16 on CPU to avoid errors
        final_precision_args = {"fp16": False, "bf16": False}
    else:
        # Use original precision settings for GPU
        final_precision_args = precision_args
    
    # Training arguments
    training_args = TrainingArguments(
        output_dir=output_dir,
        run_name=run_name,
        per_device_train_batch_size=MICRO_BATCH,
        gradient_accumulation_steps=GRAD_ACCUM,
        learning_rate=LEARNING_RATE,
        max_steps=max_steps,
        logging_steps=25,
        save_steps=100,
        save_total_limit=2,
        remove_unused_columns=False,
        dataloader_drop_last=True,
        warmup_steps=50,
        **final_precision_args
    )
    
    # Log precision settings
    print(f"🖥️  Precision: fp16={training_args.fp16} bf16={training_args.bf16}")
    
    # Data collator
    data_collator = DataCollatorForLanguageModeling(
        tokenizer=tokenizer,
        mlm=False,
        pad_to_multiple_of=8
    )
    
    # Initialize trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=dataset,
        data_collator=data_collator,
    )
    
    # Train the model
    print("📈 Training started...")
    trainer.train()
    
    # Save the final model
    print(f"💾 Saving LoRA adapter to {output_dir}")
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)
    
    print(f"✅ LoRA training complete – adapter saved to {output_dir}")
    return model

def main():
    """Main training function"""
    parser = argparse.ArgumentParser(description="Train LoRA adapter for KeyForge Typing AI")
    parser.add_argument("--test", action="store_true", help="Run quick test training (100 steps)")
    parser.add_argument("--device", choices=["auto", "cpu", "cuda"], default="auto", 
                       help="Device to use: auto (detect), cpu (force CPU), cuda (force GPU)")
    parser.add_argument("--base-model", default=BASE_MODEL, 
                       help=f"Base model to fine-tune (default: {BASE_MODEL})")
    parser.add_argument("--max-steps", type=int, default=MAX_STEPS,
                       help=f"Maximum training steps (default: {MAX_STEPS})")
    args = parser.parse_args()
    
    # Apply test mode limitations
    if args.test:
        args.max_steps = min(args.max_steps, 100)
    
    try:
        # Resolve device configuration
        device_map, use_8bit, precision_args = resolve_device(args.device)
        
        # Setup model and tokenizer
        model, tokenizer = setup_model_and_tokenizer(args.base_model, device_map, use_8bit)
        
        # Prepare dataset
        dataset = prepare_dataset(tokenizer)
        
        # Train model
        trained_model = train_model(model, tokenizer, dataset, device_map, precision_args, args.max_steps, is_test=args.test)
        
        print("\n🎉 Training completed successfully!")
        if args.test:
            print("🧪 This was a test run. For full training, run without --test flag.")
        else:
            print(f"🔮 Your KeyForge LoRA adapter is ready at: {OUTPUT_DIR}")
        
    except Exception as e:
        print(f"❌ Training failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()