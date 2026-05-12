# AURA NEURAL ENGINE v3.1 - DOCUMENTATION

Bu döküman, AURA uygulamasının teknik mimarisini, yapay zeka prompt stratejilerini ve görselleştirme mantığını açıklar.

## 1. Mimari Genel Bakış
Uygulama, "Client-Side Intelligence" ve "Server-Side Generation" hibrit modelini kullanır.

- **Computer Vision:** MediaPipe Face Mesh (Alın tespiti ve landmark takibi).
- **LLM Layer:** Server-side Gemini prompt expansion (User prompt to salon technical brief).
- **Vision Layer:** Server-side Gemini 2.5 Flash-Image / optional Pro quality mode (Prompt-driven hair edit without SAM by default).
- **UI/UX:** React + Tailwind + Canvas API (Background Neural Flow).

## 2. Arka Plan (Canvas) Animasyonu
Arka plandaki "Neural Flow" animasyonu `NeuralCanvas` bileşeni içinde HTML5 Canvas kullanılarak çizilir.

### Nasıl Artırılır?
`src/App.tsx` içindeki `draw` fonksiyonundaki şu parametreler değiştirilerek yoğunluk artırılabilir:
- `for (let i = 0; i < 12; i++)`: Dalga sayısını artırır.
- `offset`: Dalgalar arasındaki faz farkını ayarlar.
- `amplitude`: Dalgaların yüksekliğini (genliğini) ayarlar.
- `ctx.strokeStyle`: Opaklık (Alpha) değerini artırarak daha belirgin hale getirilebilir.

## 3. Yapay Zeka Prompt Stratejisi (Base Prompt)

Sistem, kullanıcının girdiği basit metni (örn: "kısa sarı saç") iki aşamalı bir süreçten geçirir.

### Aşama 1: Expansion (Genişletme)
`src/lib/gemini.ts` dosyasında `expandStylingPrompt` fonksiyonu şu base promptu kullanır:

```text
Transform the follow hair styling request into a professional, highly detailed, and technical prompt for an AI image generation model (Imagen/Stable Diffusion).
The prompt should focus on realism, cinematic lighting, hair texture, and seamless blending.

User Request: "{user_request}"

Requirements:
- Detailed hair strands and texture.
- Specifies hair length, volume, and sheen.
- Mentions "hyper-realistic", "8k", "high-end salon lighting".
- Focuses ONLY on the hair while maintaining facial identity.
```

### Aşama 2: Generation/Inpainting
Üretim aşamasında Gemini 2.5 Flash-Image modeline gönderilen nihai komut şudur:

```text
TASK: Neural Hair Styling & Simulation.
STYLING PARAMETERS: {expanded_prompt}

CRITICAL INSTRUCTIONS:
- Use internal segmentation to identify the person's hair.
- ONLY modify the hair area. 
- Maintain 100% facial identity, skin texture, and background detail.
- The new hairstyle must blend seamlessly with the hairline and ears.
- Generate a single high-fidelity image output.
```

## 4. SAM (Segment Anything) Durumu
Şu anki implementasyonda, SAM modeli yerelde (browser) çalıştırılıp maske oluşturmak yerine, **Google Gemini 2.5 Flash-Image** modelinin "In-Context Segmentation" yeteneği kullanılmaktadır. 

**Neden?**
1. **Hız:** SAM objelerini browser'da çalıştırmak yüksek GPU RAM ister.
2. **Hassasiyet:** Gemini 2.5 Flash-Image, verilen görseldeki saç bölgesini (inpainting promptu ile) kendi içinde segment edip sadece o bölgeyi değiştirebilme yeteneğine sahiptir.

**Geliştirme Planı:** Gelecek fazda, backend (Python FastAPI) entegrasyonu ile SAM checkpointleri kullanılarak milimetrik maske çıkartılıp Imagen 3 API'sine beslenecektir.

## 5. MediaPipe Nasıl Çalışıyor? (API mi?)
MediaPipe **API üzerinden çalışmaz**. Tamamen **Client-Side (Yerel)** olarak senin tarayıcında ve cihazının kendi gücünü (CPU/WebGL/GPU) kullanarak çalışır.

Kameralardan gelen saniyelik 30/60 karelik verileri internet üzerinden bir sunucuya göndermek çok yavaş olacağı için, MediaPipe (`@mediapipe/face_mesh`) kafa yapısını, alın çizgilerini ve göz koordinatlarını direkt senin bilgisayarında saniyenin binde biri hızında işler. Böylece veri gizliliği (kullanıcı onayı olmadan fotoğraf internete gitmez) ve sıfır gecikme sağlanır.

## 6. Gemini API Anahtarı (API Key) Nerede Gizli?
Projeyi incelerseniz hiçbir yerde doğrudan bir "AIzaSy..." API anahtarı dizisi göremezsiniz. Bu, güvenlik için alınan **modern mimari standartlarından** biridir.

Sistem şöyle entegre çalışır:
- **`server.ts`**: Gemini SDK yalnızca Express backend proxy içinde çalışır. Frontend doğrudan Google SDK veya API key kullanmaz.
- **`src/lib/gemini.ts`**: Tarayıcı tarafında sadece `/api/generate-style` endpoint'ine istek atan ince bir client wrapper bulunur.
- **Lokal (Kendi Bilgisayarın İçin)**: `.env.example` dosyasını `.env` yapıp `GEMINI_API_KEY` değerini buraya koymak gerekir. Anahtar browser bundle'a yazılmaz.

## 7. Donanım ve Performans
- **RTX 4070 Kullanımı:** Proje tarayıcı tabanlı olduğu için ekran kartın sadece MediaPipe Landmark tespiti ve Canvas çizimi için kullanılır. Ağır işlemler AI API'leri (Gemini Generation) üzerinden yürütülür.
