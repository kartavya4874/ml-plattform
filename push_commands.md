# Push Commands for Parametrix AI

You have two remotes configured for your repository:
1. **GitHub (`origin`)**: `https://github.com/kartavya4874/ml-plattform.git`
2. **Hugging Face (`hf`)**: `https://huggingface.co/spaces/parametrixai/Parametrix`

## To commit and push to both manually:

Open your terminal in the `ml_plattform` directory and run:

```bash
# 1. Add all your changes
git add .

# 2. Commit the changes
git commit -m "Auto-fix background tasks correction"

# 3. Push to GitHub
git push origin main

# 4. Push to Hugging Face Spaces
git push hf main
```

## To use the automated script (Windows):
I have also created a `push_all.bat` script for you in the project root. You can simply double click it, or run it through your terminal:

```cmd
.\push_all.bat "Your commit message here"
```
