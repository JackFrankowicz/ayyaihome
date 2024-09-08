import asyncio
import queue
from init import stop_event, CONSTANTS, aclient
from services.audio_player import start_audio_player  # Correct import

async def text_to_speech_processor(phrase_queue: asyncio.Queue, audio_queue: queue.Queue):
    try:
        while not stop_event.is_set():
            phrase = await phrase_queue.get()
            if phrase is None:
                audio_queue.put(None)
                return
            async with aclient.audio.speech.with_streaming_response.create(
                model=CONSTANTS["DEFAULT_TTS_MODEL"],
                voice=CONSTANTS["DEFAULT_VOICE"],
                input=phrase,
                speed=CONSTANTS["TTS_SPEED"],
                response_format="pcm"
            ) as response:
                async for audio_chunk in response.iter_bytes(CONSTANTS["TTS_CHUNK_SIZE"]):
                    if stop_event.is_set():
                        return
                    audio_queue.put(audio_chunk)
            audio_queue.put(b'\x00' * 2400)
    except Exception as e:
        print(f"Error in TTS processing: {e}")
        audio_queue.put(None)

async def process_streams(phrase_queue: asyncio.Queue, audio_queue: queue.Queue):
    """
    Manages the processing of text-to-speech and audio playback.
    """
    tts_task = asyncio.create_task(text_to_speech_processor(phrase_queue, audio_queue))
    start_audio_player(audio_queue)
    await tts_task