/**
 * patch-native-modules.js
 * Comprehensive automated patcher for cross-platform and React Native 0.77 compatibility:
 * 1. Fixes Windows anonymous pipe deadlock in @react-native-community/cli-platform-android
 * 2. Creates ViewManagerWithGeneratedInterface shim in react-native-svg for RN 0.77
 * 3. Fixes Kotlin override signature clash in react-native-gesture-handler ButtonViewGroup
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

// 1. Patch native_modules.gradle (Pipe deadlock on Windows)
const nativeModulesFile = path.join(
  rootDir,
  'node_modules',
  '@react-native-community',
  'cli-platform-android',
  'native_modules.gradle'
);

if (fs.existsSync(nativeModulesFile)) {
  let content = fs.readFileSync(nativeModulesFile, 'utf8');
  const faultyPattern = /int\s+exitCode\s*=\s*process\.waitFor\(\)\s*[\r\n]+\s*def\s+output\s*=\s*process\.inputStream\.text\.trim\(\)/;
  
  if (faultyPattern.test(content)) {
    const fixedContent = content.replace(
      faultyPattern,
      'def output = process.inputStream.text.trim()\n          int exitCode = process.waitFor()'
    );
    fs.writeFileSync(nativeModulesFile, fixedContent, 'utf8');
    console.log('[✓] Successfully patched native_modules.gradle pipe deadlock');
  } else {
    console.log('[✓] native_modules.gradle is already patched or up to date');
  }
}

// 2. Patch react-native-svg (ViewManagerWithGeneratedInterface shim for RN 0.77)
const svgTargetDir = path.join(
  rootDir,
  'node_modules',
  'react-native-svg',
  'android',
  'src',
  'main',
  'java',
  'com',
  'facebook',
  'react',
  'uimanager'
);

const svgShimFile = path.join(svgTargetDir, 'ViewManagerWithGeneratedInterface.java');

if (fs.existsSync(path.join(rootDir, 'node_modules', 'react-native-svg'))) {
  if (!fs.existsSync(svgShimFile)) {
    fs.mkdirSync(svgTargetDir, { recursive: true });
    fs.writeFileSync(
      svgShimFile,
      'package com.facebook.react.uimanager;\n\npublic interface ViewManagerWithGeneratedInterface {\n}\n',
      'utf8'
    );
    console.log('[✓] Successfully created ViewManagerWithGeneratedInterface shim for react-native-svg');
  } else {
    console.log('[✓] react-native-svg interface shim is present');
  }
}

// 3. Patch react-native-gesture-handler (Kotlin getPointerEvents signature for RN 0.77)
const gestureHandlerFile = path.join(
  rootDir,
  'node_modules',
  'react-native-gesture-handler',
  'android',
  'src',
  'main',
  'java',
  'com',
  'swmansion',
  'gesturehandler',
  'react',
  'RNGestureHandlerButtonViewManager.kt'
);

if (fs.existsSync(gestureHandlerFile)) {
  let content = fs.readFileSync(gestureHandlerFile, 'utf8');
  let changed = false;

  if (content.includes('view.pointerEvents = when (pointerEvents) {')) {
    content = content.replace(
      'view.pointerEvents = when (pointerEvents) {',
      'view.mPointerEvents = when (pointerEvents) {'
    );
    changed = true;
  }

  if (content.includes('override var pointerEvents: PointerEvents = PointerEvents.AUTO')) {
    content = content.replace(
      'override var pointerEvents: PointerEvents = PointerEvents.AUTO',
      'var mPointerEvents: PointerEvents = PointerEvents.AUTO\n\n    override fun getPointerEvents(): PointerEvents = mPointerEvents'
    );
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(gestureHandlerFile, content, 'utf8');
    console.log('[✓] Successfully patched react-native-gesture-handler button pointerEvents');
  } else {
    console.log('[✓] react-native-gesture-handler is already patched or up to date');
  }
}
