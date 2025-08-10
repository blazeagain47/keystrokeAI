#!/usr/bin/env python3
"""
Setup script for KeyForge LoRA training environment
Installs PyTorch with CUDA support and other dependencies
"""

import subprocess
import sys
import os

def run_command(cmd, description):
    """Run a command and handle errors"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(cmd, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed:")
        print(f"   Error: {e.stderr}")
        return False

def main():
    """Install all required dependencies"""
    print("🚀 Setting up KeyForge LoRA training environment...")
    
    # Check Python version
    if sys.version_info < (3, 8):
        print("❌ Python 3.8+ required")
        sys.exit(1)
    
    print(f"✅ Python {sys.version.split()[0]} detected")
    
    # Install PyTorch with CUDA support
    pytorch_cmd = "pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121"
    if not run_command(pytorch_cmd, "Installing PyTorch with CUDA support"):
        print("⚠️  CUDA installation failed, trying CPU version...")
        cpu_cmd = "pip install torch torchvision torchaudio"
        run_command(cpu_cmd, "Installing PyTorch (CPU version)")
    
    # Install other dependencies
    deps_cmd = "pip install transformers peft bitsandbytes datasets accelerate tqdm"
    run_command(deps_cmd, "Installing ML dependencies")
    
    print("\n🎉 Setup complete! You can now run:")
    print("   npm run train-lora           # Full training")
    print("   python train_lora.py --test  # Quick test")

if __name__ == "__main__":
    main()