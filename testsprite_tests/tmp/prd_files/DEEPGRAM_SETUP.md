# 🚀 SIAM with Deepgram - Setup Guide

## Overview

SIAM now uses **Deepgram's Nova-3 model** for real-time transcription, providing:
- ⚡ **True real-time streaming** (no file processing)
- 🎯 **High accuracy** with smart formatting
- 👥 **Speaker diarization** 
- 🕒 **Word-level timestamps**
- 🎨 **Preserved futuristic UI** with all themes and layouts

## Quick Start

### 1. Get Deepgram API Key
1. Sign up at [Deepgram Console](https://console.deepgram.com)
2. Create a new API key
3. Set environment variable:
```bash
export DEEPGRAM_API_KEY=your_api_key_here
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Setup Configuration
```bash
cp config.example.json config.json
# Edit config.json and add your Deepgram API key
```

### 4. Test Integration
```bash
python test_deepgram_integration.py
```

### 5. Launch SIAM

```bash
DEEPGRAM_API_KEY=your_key python integrated_cli.py --mic 0 --sys 1
```

Use `--list-devices` to see available audio devices.

## Features

### Real-time Transcription
- **Streaming**: Direct audio streaming to Deepgram (no temp files)
- **Models**: Nova-3 with smart formatting enabled
- **Languages**: Multi-language support (English default)
- **Diarization**: Automatic speaker identification

### SIAM UI Features
- **5 Themes**: Matrix, Cyberpunk, Minimal, High Contrast, Neon
- **4 Layouts**: Standard, Compact, Wide, Vertical
- **HUD Overlays**: Status bar, metrics, alerts, floating controls
- **Advanced Widgets**: Audio visualizer, transcription, insights, topics

### Key Bindings
- `Space`: Toggle recording
- `T`: Toggle theme
- `L`: Cycle layout
- `V`: Cycle visualizations
- `S`: Settings
- `B`: Bookmark
- `E`: Export
- `C`: Clear

## Configuration

### Environment Variables
```bash
# Required
export DEEPGRAM_API_KEY=your_deepgram_api_key

# Optional - for vector search and insights
export SUPABASE_URL=your_supabase_url
export SUPABASE_KEY=your_supabase_key
```

### Config File (`config.json`)
```json
{
  "deepgram_api_key": "your_deepgram_api_key_here",
  "supabase_url": "your_supabase_url_here",
  "supabase_key": "your_supabase_key_here",
  "topic_extraction_method": "tfidf",
  "relevance_threshold": 0.7,
  "max_insights_per_minute": 3,
  "cooldown_period": 20,
  "history_length": 10,
  "update_interval": 1
}
```

## Removed Dependencies

✅ **Cleaned up**:
- ❌ Google Cloud Speech (google-cloud-speech)
- ❌ OpenAI Whisper API (openai)
- ❌ Complex authentication files
- ❌ File-based audio processing
- ❌ HybridTranscriptionManager

✅ **Now using**:
- ✨ Deepgram SDK only
- ✨ Simple API key authentication
- ✨ Direct streaming architecture
- ✨ Single transcription provider

## Troubleshooting

### Common Issues

1. **API Key Error**
   ```
   Error: Deepgram API key required
   ```
   **Solution**: Set `DEEPGRAM_API_KEY` environment variable

2. **Connection Failed**
   ```
   Failed to start Deepgram streaming
   ```
   **Solution**: Check internet connection and API key validity

3. **Audio Device Error**
   ```
   Both --mic and --sys arguments are required
   ```
   **Solution**: Use `--list-devices` to find correct device indices

### Debug Mode
```bash
python integrated_cli.py --debug --mic 0 --sys 1
```

## Performance

- **Latency**: ~200-500ms (vs 3-5 seconds with Whisper)
- **Accuracy**: High with Nova-3 model
- **Resource Usage**: Lower memory (no temp files)
- **Reliability**: WebSocket streaming with auto-reconnect

## What's Different

### Before (Complex)
- Multiple transcription providers (Whisper, Chirp, Hybrid)
- File-based processing with temp files
- Complex authentication (service accounts, API keys)
- 3-5 second latency

### After (Simple)
- Single Deepgram provider
- Direct streaming architecture  
- Simple API key authentication
- Real-time (~500ms latency)

**All UI themes and features are preserved!** 🎨
