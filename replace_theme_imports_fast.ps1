$files = Get-ChildItem -Recurse -Include *.tsx, *.ts -Exclude node_modules, .git
foreach ($file in $files) {
    if ($file.FullName -like "*node_modules*" -or $file.FullName -like "*.git*") { continue }
    $content = Get-Content -LiteralPath $file.FullName
    if ($content -match '@/context/ThemeContext') {
        $newContent = $content -replace '@/context/ThemeContext', '@/lib/ThemeContext'
        $newContent | Set-Content -LiteralPath $file.FullName
        Write-Host "Updated: $($file.FullName)"
    }
}
