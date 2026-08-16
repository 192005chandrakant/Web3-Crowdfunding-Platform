$files = Get-ChildItem -Path "c:\Users\Chandrakant\Crowdfunding_platform_Project\frontend\src" -Recurse -Include "*.tsx"
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $newContent = $content
    
    # Fix remaining dual bg patterns
    $newContent = $newContent -replace 'bg-slate-200/80 dark:bg-slate-800/80', 'bg-slate-800/80'
    $newContent = $newContent -replace 'bg-slate-50 dark:bg-slate-800', 'bg-slate-800'
    $newContent = $newContent -replace 'bg-white/50 dark:bg-slate-900/50', 'bg-slate-900/50'

    if ($content -ne $newContent) {
        Set-Content $file.FullName -Value $newContent -NoNewline
        Write-Output ("Fixed: " + $file.Name)
    }
}
Write-Output "Done!"
