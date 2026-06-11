# AURA Engine v5 - Serverless API Tabanlı 3 Aşamalı AI & AR Stratejisi

Bu doküman, AURA'nın kullanıcıların saç modellerini en gerçekçi şekilde deneyimleyebilmesi için planlanan **3 Fazlı (Fotoğraf, Video, Canlı AR)** mimarinin, **kendi GPU sunucumuzu kurmadan tamamen API ve Cloud Serverless çözümlerle** nasıl hayata geçirileceğini açıklar.

## 1. Ürün Vizyonu ve 3 Aşamalı MVP
AURA, saç modeli deneme işini 3 farklı seviyede sunar:
*   **Faz 1: Stüdyo Modu (Fotoğraf):** Kişinin yüzüne %100 sadık kalınarak (FaceID) yüksek çözünürlüklü saç deneme görselleri üretilmesi.
*   **Faz 2: Sinematik Mod (AI Video):** Seçilen saçla hafifçe hareket edilen veya saçın dalgalandığı kısa, viral olmaya müsait AI videolar.
*   **Faz 3: Canlı AR Ayna (Gerçek Zamanlı):** Telefon kamerası üzerinden, ayna karşısındaymışcasına düşük gecikmeli, Işığa/Ortama uyumlu canlı saç denemesi.

---

## 2. API ve Modellerin Seçimi (Sıfır GPU Sunucu Maliyetiyle)

"Kendi GPU sunucumuz yok" varsayımı ile piyasadaki en güncel **Serverless GPU API** (kullandıkça öde) servislerini entegre etmeliyiz.

### A. Faz 1: Yüz Kimliğini Koruyan Saç Fotoğrafları (ControlNet / IP-Adapter API'leri)
Kişinin yüzünün aynen kalması için "ControlNet" veya "IP-Adapter/PhotoMaker" teknolojileri şarttır. Bunu kendi sunucumuz olmadan şu API'ler ile çözebiliriz:
*   **Replicate API / Fal.ai / Banana.dev:** Bu platformlarda Stable Diffusion (SDXL) tabanlı ve **ControlNet (FaceID) destekli hazır API uç noktaları** bulunur. 
*   **Nasıl Çalışır?** React (Vite) istemcisinden fotoğrafınızı backend'inize (server.ts) ordan da doğrudan Replicate/Fal.ai API'sine (Örn: `puLID` veya `FaceID` uç noktasına) atarsınız. API size saniyeler içinde kişinin kendi yüzüyle yeni saçlı halinin URL'sini döner.
*   **Gemini 2.5 Pro Vision/Flash kullanımı:** Görseli detaylı analiz edip en doğru "text prompt"u (istemi) üretmek için kullanılır. Ama asıl görsel üretimi SDXL/ControlNet API üzerinden yapılır.

### B. Faz 2: Saç Modeli Videolarının Üretimi
Video üretimi maliyetli bir iştir ancak API servisleriyle gayet mümkündür:
*   **Google Veo API:** Google'ın Sora rakibi Veo modeli, Vertex AI üzerinden API ile erişime açılmaktadır. Üretilen yüksek kaliteli sahte fotoğraf (Faz 1) Veo'ya "ilk kare (Image-to-Video)" olarak verilerek çok gerçekçi bir saç videosu elde edilir.
*   **Alternatif API'ler:** Luma Dream Machine API, Runway Gen-3 API veya Replicate üzerindeki AnimateDiff/Kling API'leri.
*   **Nasıl Çalışır?** Faz 1'deki sonuç üzerinden backend bir API çağrısı yapar. Video genelde 1-3 dakika içinde oluşur, bu sürede ön yüzde `NeuralCanvas` animasyonu ile kullanıcı bekletilir.

### C. Faz 3: Gerçek Zamanlı AI (Live AR Serverless)
Gerçek zamanlı kullanım için kendi bilgisayarımızın GPU'su yetersizse veya sunucu alamıyorsak, **Real-Time GenAI WebSocket API** kullanırız.
*   **Fal.ai Real-Time API:** Fal.ai platformu, özel bir gecikmesiz ağ üzerinden "Stable Diffusion Turbo" veya "LCM (Latent Consistency Models)" çalıştırmanıza izin verir.
*   **Nasıl Çalışır:**
    1.  Kamera saniyede 15-30 kez (FPS) frame çeker.
    2.  Kareler WebRTC veya fal.ai `WebSocket (ws://)` bağlantısı ile direkt buluta gönderilir.
    3.  Cloud GPU anında (100ms altı sürede) saçı Inpaint yapıp (gerekirse IP-Adapter ile) geri yollar. O kadar hızlıdır ki, sanki kendi bilgisayarınızda çalışıyor gibi görünür.
*   **Ayrıca Gemini Nano:** Nano on-device (cihazda yerel) çalışır ancak şu anki kapasitesi ağır Inpainting/AR renderından ziyade, anlık konuşma, metin analizidir. Dolayısıyla görsel renderını Real-time WebSocket API'ye bırakmak en iyisidir.

---

## 3. Geliştirme Yol Haritası (Serverless MVP İçin)

**Adım 1: Stüdyo Modu (Fotoğraf) - Hazır API Entegrasyonu**
*   **Replicate** veya **Fal.ai** üzerinde `SDXL + PuLID/IP-Adapter` modeli bulunur.
*   Sistem, kullanıcının resmini ve Gemini'nin ürettiği Prompt'u IP-Adapter API'sine yollar, orijinal yüzle farklı saç modeli resmini alır.
*   Maliyet sadece API isteği başınadır (0.01$ - 0.03$).

**Adım 2: Sinema Modu (Video) - Image-to-Video API**
*   Çıkan statik resim **Google Veo** veya **Luma API**'sine gönderilir.
*   Hafif bir saç sallanması promptu ile (sinematik hava) video elde edilip UI'a basılır.

**Adım 3: Canlı AR Modu (Real-Time WebSocket) Entegrasyonu**
*   Kendi sunucumuz yerine **Fal.ai'nin Realtime LCM API'si** kurulur.
*   Kameradan sadece saç bölgesini maskelemek için (Eğer API maske istiyorsa) tarayıcıda `@mediapipe/image_segmentation` ile çok hızlı (0 maliyetli) saç maskesi çıkarılıp bu maske + kamera görüntüsü buluta WS ile saniyelik olarak atılır. Buluttan canlı AR görüntüsü çekilir.
