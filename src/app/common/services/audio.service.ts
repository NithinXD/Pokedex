import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AudioService {
  private audio: HTMLAudioElement | null = null;

  /** True while a Pokémon cry is playing */
  readonly isPlaying = signal(false);

  playCry(pokemonId: number): void {
    // Stop any existing cry first
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }

    const url = `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${pokemonId}.ogg`;
    this.audio = new Audio(url);
    this.audio.volume = 0.6;

    this.audio.play()
      .then(() => this.isPlaying.set(true))
      .catch(() => this.isPlaying.set(false));

    this.audio.onended = () => this.isPlaying.set(false);
    this.audio.onerror = () => this.isPlaying.set(false);
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
    this.isPlaying.set(false);
  }
}
