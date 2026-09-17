# Contributing to Project MagicWeb

We welcome contributions from the community! Please follow these guidelines:

## Development Workflow

1. Fork the repository and create your feature branch:
   ```bash
   git checkout -b feat/my-new-feature
   ```

2. Verify all automated tests pass:
   ```bash
   npm test
   ```

3. Ensure code adheres to the zero-mock principle: all microservices must run real code in isolated Web Workers or WebAssembly linear memory.

4. Submit a pull request with clear description and benchmark results.
