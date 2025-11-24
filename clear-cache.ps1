# Clear all Metro and Expo caches
Write-Host "Clearing Metro and Expo caches..." -ForegroundColor Yellow

# Clear Metro cache
if (Test-Path "node_modules\.cache") {
    Remove-Item -Recurse -Force "node_modules\.cache"
    Write-Host "✓ Cleared node_modules/.cache" -ForegroundColor Green
}

# Clear .metro directory
if (Test-Path ".metro") {
    Remove-Item -Recurse -Force ".metro"
    Write-Host "✓ Cleared .metro directory" -ForegroundColor Green
}

# Clear temp caches
if (Test-Path "$env:TEMP\react-*") {
    Remove-Item -Recurse -Force "$env:TEMP\react-*" -ErrorAction SilentlyContinue
    Write-Host "✓ Cleared React temp caches" -ForegroundColor Green
}

if (Test-Path "$env:TEMP\metro-*") {
    Remove-Item -Recurse -Force "$env:TEMP\metro-*" -ErrorAction SilentlyContinue
    Write-Host "✓ Cleared Metro temp caches" -ForegroundColor Green
}

# Clear Watchman if available
if (Get-Command watchman -ErrorAction SilentlyContinue) {
    watchman watch-del-all 2>$null
    Write-Host "✓ Cleared Watchman cache" -ForegroundColor Green
}

Write-Host "`nCache clearing complete! Now restart Metro with: npx expo start --clear" -ForegroundColor Cyan

