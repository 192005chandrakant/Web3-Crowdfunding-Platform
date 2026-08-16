$files = Get-ChildItem -Path "c:\Users\Chandrakant\Crowdfunding_platform_Project\frontend\src" -Recurse -Include "*.tsx"
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $newContent = $content
    
    # Fix contradictory dark mode text classes
    $newContent = $newContent -replace 'text-slate-100 dark:text-slate-900 dark:text-slate-100', 'text-slate-100'
    $newContent = $newContent -replace 'text-slate-400 dark:text-slate-600 dark:text-slate-400', 'text-slate-400'
    $newContent = $newContent -replace 'text-slate-500 dark:text-slate-500', 'text-slate-500'
    $newContent = $newContent -replace 'text-slate-800 dark:text-slate-200', 'text-slate-200'
    $newContent = $newContent -replace 'text-slate-700 dark:text-slate-300', 'text-slate-300'
    $newContent = $newContent -replace 'text-slate-400 dark:text-slate-600', 'text-slate-400'
    $newContent = $newContent -replace 'dark:text-slate-600 dark:text-slate-400', 'text-slate-400'
    
    # Fix contradictory dark mode backgrounds  
    $newContent = $newContent -replace 'bg-slate-200/50 dark:bg-slate-800/50', 'bg-slate-800/50'
    $newContent = $newContent -replace 'bg-slate-200/40 dark:bg-slate-800/40', 'bg-slate-800/40'
    $newContent = $newContent -replace 'bg-slate-200/60 dark:bg-slate-800/60', 'bg-slate-800/60'
    $newContent = $newContent -replace 'bg-slate-200 dark:bg-slate-700', 'bg-slate-700'
    $newContent = $newContent -replace 'bg-slate-100 dark:bg-slate-800', 'bg-slate-800'
    $newContent = $newContent -replace 'bg-slate-100/40 dark:bg-slate-900/40', 'bg-slate-900/40'
    $newContent = $newContent -replace 'bg-slate-100/50 dark:bg-slate-900/50', 'bg-slate-900/50'
    $newContent = $newContent -replace 'bg-slate-100/80 dark:bg-slate-900/80', 'bg-slate-900/80'
    $newContent = $newContent -replace 'bg-slate-100 dark:bg-slate-900', 'bg-slate-900'
    $newContent = $newContent -replace 'bg-slate-50 dark:bg-slate-900', 'bg-slate-900'
    $newContent = $newContent -replace 'bg-white dark:bg-slate-950', 'bg-slate-950'
    $newContent = $newContent -replace 'bg-white dark:bg-slate-900', 'bg-slate-900'
    $newContent = $newContent -replace 'from-slate-50 dark:from-slate-900/90', 'from-slate-900/90'
    $newContent = $newContent -replace 'from-slate-50 dark:from-slate-900', 'from-slate-900'
    $newContent = $newContent -replace 'via-slate-50 dark:via-slate-900/20', 'via-slate-900/20'
    $newContent = $newContent -replace 'dark:from-slate-900/90', 'from-slate-900/90'
    
    # Fix contradictory border classes
    $newContent = $newContent -replace 'border-emerald-500/40 dark:border-emerald-500/30 dark:border-emerald-500/20', 'border-emerald-500/20'
    $newContent = $newContent -replace 'border-emerald-500/40 dark:border-emerald-500/30', 'border-emerald-500/30'
    $newContent = $newContent -replace 'border-red-500/50 dark:border-red-500/40 dark:border-red-500/30 dark:border-red-500/20', 'border-red-500/20'
    $newContent = $newContent -replace 'border-primary-500/60 dark:border-primary-500/50 dark:border-primary-500/40', 'border-primary-500/40'
    $newContent = $newContent -replace 'border-primary-500/60 dark:border-primary-500/50', 'border-primary-500/50'
    $newContent = $newContent -replace 'dark:border-primary-500/50 dark:border-primary-500/40 dark:border-primary-500/30', 'border-primary-500/30'
    $newContent = $newContent -replace 'dark:border-primary-500/50 dark:border-primary-500/40', 'border-primary-500/40'
    $newContent = $newContent -replace 'border-danger-500/40 dark:border-danger-500/30', 'border-danger-500/30'
    $newContent = $newContent -replace 'border-amber-500/40 dark:border-amber-500/30', 'border-amber-500/30'
    
    # Fix text color dark overrides
    $newContent = $newContent -replace 'text-primary-700 dark:text-primary-300', 'text-primary-300'
    $newContent = $newContent -replace 'text-primary-600 dark:text-primary-400', 'text-primary-400'
    $newContent = $newContent -replace 'text-slate-700 dark:text-slate-200', 'text-slate-200'
    $newContent = $newContent -replace 'hover:text-slate-800 dark:text-slate-200', 'hover:text-slate-200'
    $newContent = $newContent -replace 'hover:text-slate-700 dark:text-slate-300', 'hover:text-slate-300'
    $newContent = $newContent -replace 'text-slate-600 dark:text-slate-400', 'text-slate-400'
    
    # Fix remaining bg patterns
    $newContent = $newContent -replace 'bg-slate-50 dark:bg-slate-900/40', 'bg-slate-900/40'
    $newContent = $newContent -replace 'dark:bg-slate-700/30', 'bg-slate-700/30'
    $newContent = $newContent -replace 'dark:bg-slate-700/50', 'bg-slate-700/50'
    $newContent = $newContent -replace 'dark:bg-slate-900/95', 'bg-slate-900/95'
    $newContent = $newContent -replace 'bg-slate-200 dark:bg-slate-800/50', 'bg-slate-800/50'
    $newContent = $newContent -replace 'hover:bg-slate-200 dark:bg-slate-700/50', 'hover:bg-slate-700/50'
    $newContent = $newContent -replace 'bg-slate-100/50 dark:bg-slate-900/50', 'bg-slate-900/50'
    $newContent = $newContent -replace 'group-hover:text-slate-700 dark:text-slate-300', 'group-hover:text-slate-300'

    if ($content -ne $newContent) {
        Set-Content $file.FullName -Value $newContent -NoNewline
        Write-Output ("Fixed: " + $file.Name)
    }
}
Write-Output "Done!"
