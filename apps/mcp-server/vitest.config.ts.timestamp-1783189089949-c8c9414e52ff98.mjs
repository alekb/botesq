// vitest.config.ts
import { defineConfig } from "file:///mnt/c/Users/beyne/Dropbox/Alek/projects/bot-law/node_modules/.pnpm/vitest@1.6.1_@types+node@20.19.31_jsdom@24.1.3/node_modules/vitest/dist/config.js";
var vitest_config_default = defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://test:test@localhost:5432/botesq_test"
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/index.ts"]
    }
  }
});
export {
  vitest_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZXN0LmNvbmZpZy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9tbnQvYy9Vc2Vycy9iZXluZS9Ecm9wYm94L0FsZWsvcHJvamVjdHMvYm90LWxhdy9hcHBzL21jcC1zZXJ2ZXJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9tbnQvYy9Vc2Vycy9iZXluZS9Ecm9wYm94L0FsZWsvcHJvamVjdHMvYm90LWxhdy9hcHBzL21jcC1zZXJ2ZXIvdml0ZXN0LmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vbW50L2MvVXNlcnMvYmV5bmUvRHJvcGJveC9BbGVrL3Byb2plY3RzL2JvdC1sYXcvYXBwcy9tY3Atc2VydmVyL3ZpdGVzdC5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlc3QvY29uZmlnJ1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICB0ZXN0OiB7XG4gICAgZ2xvYmFsczogdHJ1ZSxcbiAgICBlbnZpcm9ubWVudDogJ25vZGUnLFxuICAgIGluY2x1ZGU6IFsnc3JjLyoqLyoudGVzdC50cyddLFxuICAgIGVudjoge1xuICAgICAgTk9ERV9FTlY6ICd0ZXN0JyxcbiAgICAgIERBVEFCQVNFX1VSTDogJ3Bvc3RncmVzcWw6Ly90ZXN0OnRlc3RAbG9jYWxob3N0OjU0MzIvYm90ZXNxX3Rlc3QnLFxuICAgIH0sXG4gICAgY292ZXJhZ2U6IHtcbiAgICAgIHByb3ZpZGVyOiAndjgnLFxuICAgICAgcmVwb3J0ZXI6IFsndGV4dCcsICdqc29uJywgJ2h0bWwnXSxcbiAgICAgIGluY2x1ZGU6IFsnc3JjLyoqLyoudHMnXSxcbiAgICAgIGV4Y2x1ZGU6IFsnc3JjLyoqLyoudGVzdC50cycsICdzcmMvaW5kZXgudHMnXSxcbiAgICB9LFxuICB9LFxufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBc1gsU0FBUyxvQkFBb0I7QUFFblosSUFBTyx3QkFBUSxhQUFhO0FBQUEsRUFDMUIsTUFBTTtBQUFBLElBQ0osU0FBUztBQUFBLElBQ1QsYUFBYTtBQUFBLElBQ2IsU0FBUyxDQUFDLGtCQUFrQjtBQUFBLElBQzVCLEtBQUs7QUFBQSxNQUNILFVBQVU7QUFBQSxNQUNWLGNBQWM7QUFBQSxJQUNoQjtBQUFBLElBQ0EsVUFBVTtBQUFBLE1BQ1IsVUFBVTtBQUFBLE1BQ1YsVUFBVSxDQUFDLFFBQVEsUUFBUSxNQUFNO0FBQUEsTUFDakMsU0FBUyxDQUFDLGFBQWE7QUFBQSxNQUN2QixTQUFTLENBQUMsb0JBQW9CLGNBQWM7QUFBQSxJQUM5QztBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
