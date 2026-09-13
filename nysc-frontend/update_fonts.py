import os
import re

files = [
    'src/pages/AdminDashboard.jsx',
    'src/components/admin/AdminOverview.jsx',
    'src/components/admin/AdminUsers.jsx',
    'src/components/admin/AdminPapers.jsx',
    'src/components/admin/AdminPayments.jsx',
    'src/components/admin/AdminAuditLogs.jsx',
    'src/components/admin/AdminSettings.jsx'
]

for f in files:
    try:
        with open(f, 'r', encoding='utf-8') as file:
            content = file.read()
        
        content = re.sub(r'\btext-4xl\b', 'text-5xl', content)
        content = re.sub(r'\btext-3xl\b', 'text-4xl', content)
        content = re.sub(r'\btext-2xl\b', 'text-3xl', content)
        content = re.sub(r'\btext-xl\b', 'text-2xl', content)
        content = re.sub(r'\btext-lg\b', 'text-xl', content)
        content = re.sub(r'\btext-base\b', 'text-lg', content)
        content = re.sub(r'\btext-sm\b', 'text-base', content)
        content = re.sub(r'\btext-xs\b', 'text-sm', content)
        
        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)
        print(f'Updated {f}')
    except Exception as e:
        print(f'Error updating {f}: {e}')
