# Check if Git is installed
$gitCheck = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitCheck) {
    Write-Host "==========================================================" -ForegroundColor Red
    Write-Host "Git is not installed on this system." -ForegroundColor Red
    Write-Host "Please install Git by running the following command:" -ForegroundColor Yellow
    Write-Host "  winget install --id Git.Git -e --source winget" -ForegroundColor Cyan
    Write-Host "==========================================================" -ForegroundColor Red
    Read-Host "Press Enter to exit..."
    exit
}

Write-Host "Initializing Git Repository..." -ForegroundColor Green
git init

Write-Host "Adding files to stage..." -ForegroundColor Green
git add .

Write-Host "Creating Initial Commit..." -ForegroundColor Green
git commit -m "Initial commit: NexusEvents Booking Platform"

git branch -M main

Write-Host ""
Write-Host "----------------------------------------------------------" -ForegroundColor Yellow
Write-Host "Repository initialized and committed locally!" -ForegroundColor Green
Write-Host "Please enter your GitHub Repository URL (e.g., https://github.com/username/repo-name.git):" -ForegroundColor Yellow
$repoUrl = Read-Host "GitHub Remote URL"

if ($repoUrl) {
    # Check if remote already exists and update or add it
    $remoteCheck = git remote get-url origin 2>$null
    if ($remoteCheck) {
        git remote set-url origin $repoUrl
    } else {
        git remote add origin $repoUrl
    }
    
    Write-Host "Pushing to GitHub (main branch)..." -ForegroundColor Green
    git push -u origin main
    Write-Host "Uploaded successfully!" -ForegroundColor Green
} else {
    Write-Host "No repository URL provided. Committed locally only." -ForegroundColor Yellow
}

Read-Host "Press Enter to finish..."
