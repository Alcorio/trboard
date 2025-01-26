
// https://stackoverflow.com/questions/79119287/proper-eslint-configuration-under-nextjs-15
import pluginNext from '@next/eslint-plugin-next';   // next.js的eslint插件
import parser from '@typescript-eslint/parser'; // optional  typescript解析器
import validateJSXNesting from 'eslint-plugin-validate-jsx-nesting';

export default [   // 默认导出ESLint的配置数组
  {
    name: 'ESLint Config - nextjs',
    languageOptions: {
      parser, // optional
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@next/next': pluginNext,
      'validate-jsx-nesting': validateJSXNesting,   // 添加该jsx插件

    },
    files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
    ignores: ['.next/**'], 
    rules: {
      ...pluginNext.configs.recommended.rules,
      ...pluginNext.configs['core-web-vitals'].rules,
      "validate-jsx-nesting/no-invalid-jsx-nesting": "error",
    },
  },
];
// 运行检查方式 npx eslint .

// 默认配置下报错 改为上面的代码
// import { dirname } from "path";
// import { fileURLToPath } from "url";
// import { FlatCompat } from "@eslint/eslintrc";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

// const compat = new FlatCompat({
//   baseDirectory: __dirname,
// });

// const eslintConfig = [...compat.extends("next/core-web-vitals")];

// export default eslintConfig;

