# KeyForge LoRA Training Guide

## 🚀 Quick Start

### 1. Setup Python Environment
```bash
npm run setup-python
```
This installs PyTorch with CUDA support and all ML dependencies.

### 2. Extract Dataset
```bash
npm run extract-dataset
```
Generates `data/typing_dataset.jsonl` from Firestore (54 records).

### 3. Train LoRA Adapter

**Quick Test** (100 steps, ~3-5 minutes):
```bash
python train_lora.py --test --device cpu
```

**Full Training** (300 steps, ~25-30 minutes):
```bash
npm run train-lora -- --device cpu
```

## 📊 Training Configuration

| Parameter | Value |
|-----------|-------|
| Base Model | `TinyLlama/TinyLlama-1.1B-Chat-v1.0` |
| Quantization | Full precision (no 8-bit) |
| LoRA Rank | 16 |
| LoRA Alpha | 32 |
| Target Modules | `q_proj`, `v_proj` |
| Learning Rate | 2e-4 |
| Batch Size | 2 (micro) × 16 (grad accum) = 32 |
| Max Steps | 300 (test: 100) |

## 📁 Output

- **Model**: `models/keyforge-lora/`
- **Checkpoints**: Saved every 100 steps
- **Logs**: Training metrics and progress

## 🔧 Hardware Requirements

- **CPU**: Primary target (TinyLlama optimized for CPU)
- **GPU**: Optional (but not using 8-bit quantization)
- **Memory**: 16GB RAM (TinyLlama-1.1B fits comfortably)

## 🧪 Troubleshooting

### CUDA Issues
If CUDA installation fails:
```bash
pip install torch torchvision torchaudio  # CPU version
```

### Memory Issues
- Reduce `MICRO_BATCH` from 2 to 1
- Increase `GRAD_ACCUM` to maintain effective batch size

### Dataset Issues
Make sure `data/typing_dataset.jsonl` exists:
```bash
npm run extract-dataset
```

## 📈 Next Steps

After training completes:
1. Model saved to `models/keyforge-lora/`
2. Ready for inference/deployment
3. Can be loaded with `peft.PeftModel.from_pretrained()`