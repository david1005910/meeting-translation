#!/usr/bin/env node
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔨 Building MultiMeet Windows executable...');

// Windows 용 pkg 타겟 설정
const targets = [
  'node18-win-x64',  // Windows 64-bit
  'node18-win-x86'   // Windows 32-bit (옵션)
];

// 백엔드 디렉토리로 이동
process.chdir(path.join(__dirname, 'backend'));

console.log('📦 Building for Windows platforms...');

// Windows x64 (64-bit) 빌드
exec(`npx pkg . --targets node18-win-x64 --output ../multimeet-win-x64.exe`, (error, stdout, stderr) => {
  if (error) {
    console.error('Error building Windows x64 executable:', error);
    console.error(stderr);
  } else {
    console.log('✅ Windows 64-bit executable built: multimeet-win-x64.exe');
  }
  
  // Windows x86 (32-bit) 빌드 (선택사항)
  exec(`npx pkg . --targets node18-win-x86 --output ../multimeet-win-x86.exe`, (error, stdout, stderr) => {
    if (error) {
      console.error('Error building Windows x86 executable:', error);
      console.error(stderr);
    } else {
      console.log('✅ Windows 32-bit executable built: multimeet-win-x86.exe');
    }
    
    console.log('\n📋 Windows 실행 파일이 생성되었습니다:');
    console.log('- multimeet-win-x64.exe (64-bit Windows용)');
    console.log('- multimeet-win-x86.exe (32-bit Windows용)');
    console.log('\n⚠️  Windows에서 실행하기 전에:');
    console.log('1. PostgreSQL 15 설치 필요');
    console.log('2. Redis 설치 필요 (또는 Windows용 Redis 대체품)');
    console.log('3. Ollama Windows 버전 설치 필요');
    console.log('4. .env 파일을 exe 파일과 같은 폴더에 복사');
    console.log('5. uploads 폴더 생성 필요');
  });
});