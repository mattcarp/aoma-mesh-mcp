# Contributing to SIAM 🤝

Thank you for your interest in contributing to SIAM! We welcome contributions from developers of all skill levels. This guide will help you get started.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Code Style](#code-style)
- [Submitting Changes](#submitting-changes)
- [Issue Guidelines](#issue-guidelines)
- [Pull Request Process](#pull-request-process)

## 📜 Code of Conduct

This project adheres to a code of conduct that we expect all contributors to follow:

- **Be respectful**: Treat everyone with respect and kindness
- **Be inclusive**: Welcome newcomers and help them learn
- **Be collaborative**: Work together to improve the project
- **Be constructive**: Provide helpful feedback and suggestions

## 🚀 Getting Started

### Prerequisites

- Python 3.8 or higher
- Git
- Basic knowledge of Python and terminal interfaces
- Familiarity with audio processing concepts (helpful but not required)

### Areas for Contribution

We welcome contributions in several areas:

- **🐛 Bug fixes**: Help us identify and fix issues
- **✨ New features**: Implement new functionality
- **📚 Documentation**: Improve guides, examples, and API docs
- **🧪 Testing**: Add tests and improve test coverage
- **🎨 UI/UX**: Enhance the terminal interface and user experience
- **⚡ Performance**: Optimize audio processing and rendering
- **🌐 Accessibility**: Make SIAM more accessible to all users

## 🛠️ Development Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/siam.git
cd siam

# Add the original repository as upstream
git remote add upstream https://github.com/original/siam.git
```

### 2. Set Up Environment

```bash
# Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install development dependencies
pip install pytest black flake8 mypy pre-commit

# Install pre-commit hooks
pre-commit install
```

### 3. Verify Setup

```bash
# Run tests to ensure everything works
pytest

# Check code style
black --check src/
flake8 src/

# Run the application
python integrated_siam.py
```

## 🔄 Making Changes

### 1. Create a Branch

```bash
# Create and switch to a new branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description
```

### 2. Branch Naming Convention

- **Features**: `feature/description-of-feature`
- **Bug fixes**: `fix/issue-description`
- **Documentation**: `docs/what-you-are-documenting`
- **Performance**: `perf/optimization-description`
- **Refactoring**: `refactor/component-being-refactored`

### 3. Make Your Changes

- Keep changes focused and atomic
- Write clear, descriptive commit messages
- Add tests for new functionality
- Update documentation as needed

### 4. Commit Guidelines

```bash
# Good commit messages
git commit -m "feat: add real-time audio level visualization"
git commit -m "fix: resolve audio device selection issue on Windows"
git commit -m "docs: update installation instructions for macOS"
git commit -m "test: add unit tests for topic extraction"

# Commit message format
type(scope): description

# Types: feat, fix, docs, test, refactor, perf, style, chore
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage report
pytest --cov=src --cov-report=html

# Run specific test file
pytest tests/test_audio.py

# Run tests with verbose output
pytest -v

# Run tests for specific functionality
pytest -k "audio"
```

### Writing Tests

```python
# Example test structure
import pytest
from unittest.mock import MagicMock, patch
import numpy as np

from src.audio.processor import AudioProcessor

class TestAudioProcessor:
    def setup_method(self):
        """Set up test fixtures before each test method."""
        self.processor = AudioProcessor()
        self.sample_audio = np.random.rand(1024).astype(np.float32) * 0.1
    
    def test_fft_calculation(self):
        """Test FFT calculation produces expected output."""
        fft_data = self.processor.compute_fft(self.sample_audio)
        
        assert len(fft_data) == self.processor.fft_size // 2 + 1
        assert np.all(fft_data >= 0)  # Magnitude should be non-negative
    
    @patch('src.audio.processor.pyaudio.PyAudio')
    def test_audio_device_detection(self, mock_pyaudio):
        """Test audio device detection with mocked PyAudio."""
        mock_pyaudio.return_value.get_device_count.return_value = 2
        
        devices = self.processor.get_available_devices()
        assert len(devices) >= 0
```

### Test Coverage

We aim for at least 80% test coverage. Focus on:

- **Unit tests**: Test individual functions and classes
- **Integration tests**: Test component interactions
- **End-to-end tests**: Test complete workflows
- **Performance tests**: Ensure performance requirements are met

## 🎨 Code Style

### Python Style Guide

We follow [PEP 8](https://www.python.org/dev/peps/pep-0008/) with some modifications:

```python
# Use Black for automatic formatting
black src/ tests/

# Check style with flake8
flake8 src/ tests/

# Type checking with mypy
mypy src/
```

### Code Formatting

```python
# Good: Clear, descriptive names
def calculate_audio_level(audio_data: np.ndarray) -> float:
    """Calculate the audio level from raw audio data."""
    return np.sqrt(np.mean(audio_data ** 2))

# Good: Type hints and docstrings
class AudioProcessor:
    """Processes audio data for real-time analysis."""
    
    def __init__(self, sample_rate: int = 16000) -> None:
        self.sample_rate = sample_rate
        self.fft_size = 1024
    
    def process_chunk(self, audio_chunk: np.ndarray) -> Dict[str, Any]:
        """Process a chunk of audio data."""
        return {
            'level': self.calculate_level(audio_chunk),
            'fft': self.compute_fft(audio_chunk),
            'timestamp': time.time()
        }
```

### Documentation Style

```python
def extract_topics(text: str, max_topics: int = 10) -> List[Dict[str, Any]]:
    """
    Extract topics from text using TF-IDF analysis.
    
    Args:
        text: Input text to analyze
        max_topics: Maximum number of topics to return
        
    Returns:
        List of topic dictionaries with 'text' and 'relevance' keys
        
    Raises:
        ValueError: If text is empty or max_topics is invalid
        
    Example:
        >>> topics = extract_topics("Meeting about project timeline")
        >>> print(topics[0]['text'])
        'project'
    """
```

## 📤 Submitting Changes

### 1. Update Your Branch

```bash
# Fetch latest changes from upstream
git fetch upstream

# Rebase your branch on the latest main
git rebase upstream/main
```

### 2. Run Final Checks

```bash
# Format code
black src/ tests/

# Run linting
flake8 src/ tests/

# Run type checking
mypy src/

# Run all tests
pytest

# Check test coverage
pytest --cov=src --cov-report=term-missing
```

### 3. Push Changes

```bash
# Push your branch to your fork
git push origin feature/your-feature-name
```

## 📋 Issue Guidelines

### Reporting Bugs

When reporting bugs, please include:

```markdown
**Bug Description**
A clear description of what the bug is.

**Steps to Reproduce**
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected Behavior**
What you expected to happen.

**Actual Behavior**
What actually happened.

**Environment**
- OS: [e.g. macOS 12.0]
- Python version: [e.g. 3.9.7]
- SIAM version: [e.g. 1.0.0]

**Additional Context**
Any other context about the problem.
```

### Feature Requests

For feature requests, please include:

```markdown
**Feature Description**
A clear description of the feature you'd like to see.

**Use Case**
Describe the problem this feature would solve.

**Proposed Solution**
Describe how you envision this feature working.

**Alternatives Considered**
Any alternative solutions you've considered.

**Additional Context**
Any other context or screenshots about the feature.
```

## 🔄 Pull Request Process

### 1. Create Pull Request

- Use a clear, descriptive title
- Reference any related issues
- Provide a detailed description of changes
- Include screenshots for UI changes

### 2. Pull Request Template

```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] New tests added for new functionality
- [ ] Test coverage maintained or improved

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings introduced
```

### 3. Review Process

1. **Automated checks**: CI/CD pipeline runs tests and checks
2. **Code review**: Maintainers review your code
3. **Feedback**: Address any requested changes
4. **Approval**: Once approved, your PR will be merged

### 4. After Merge

```bash
# Switch back to main branch
git checkout main

# Pull latest changes
git pull upstream main

# Delete your feature branch
git branch -d feature/your-feature-name
git push origin --delete feature/your-feature-name
```

## 🏷️ Release Process

### Versioning

We use [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Changelog

All notable changes are documented in `CHANGELOG.md`:

```markdown
## [1.2.0] - 2023-12-01

### Added
- Real-time audio level visualization
- Performance monitoring in footer
- Adaptive quality settings

### Changed
- Improved audio processing pipeline
- Enhanced error handling

### Fixed
- Audio device selection on Windows
- Memory leak in transcription engine
```

## 🆘 Getting Help

### Community Support

- **GitHub Discussions**: Ask questions and share ideas
- **Issues**: Report bugs and request features
- **Discord**: Join our community chat (link in README)

### Maintainer Contact

- Create an issue for bugs or feature requests
- Use discussions for general questions
- Tag maintainers in PRs for urgent reviews

## 🎯 Good First Issues

Looking for a place to start? Check out issues labeled:

- `good first issue`: Perfect for newcomers
- `help wanted`: We'd love community help
- `documentation`: Improve our docs
- `testing`: Add or improve tests

## 📚 Additional Resources

- [Python Style Guide (PEP 8)](https://www.python.org/dev/peps/pep-0008/)
- [Git Best Practices](https://git-scm.com/book/en/v2)
- [Testing Best Practices](https://docs.pytest.org/en/stable/)
- [Audio Processing Concepts](docs/audio_processing.md)

---

Thank you for contributing to SIAM! Your efforts help make meetings smarter for everyone. 🚀
