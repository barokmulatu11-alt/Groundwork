$files = Get-ChildItem -Recurse -Include *.tsx, *.ts
foreach ($file in $files) {
    $content = Get-Content -LiteralPath $file.FullName
    $newContent = $content -replace '@/context/ThemeContext', '@/lib/ThemeContext'
    $newContent | Set-Content -LiteralPath $file.FullName
}
