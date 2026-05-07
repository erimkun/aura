# AURA NEURAL ENGINE - PROJE DURUMU VE YOL HARİTASI (ROADMAP)

Bu belge, "AI Hair Stylist" (Aura) projesinin mevcut durumunu ve ileride yapılacak eklentileri (Fazları) ve hedefleri listeler.

## 🟢 MEVCUT DURUM (FAZ 1 - AKTİF & ÇALIŞIYOR)
Şu anki versiyonda uygulanan ve başarıyla çalışan temel sistemler:

- **Kullanıcı Arayüzü (UI/UX):** React, Vite ve TailwindCSS ile fütüristik, nöral ağ temalı bir stüdyo arayüzü kuruldu. Canvas API ile siber/dinamik arka plan animasyonları (Neural Waves) entegre edildi.
- **Computer Vision (MediaPipe):** `react-webcam` ve `@mediapipe/face_mesh` entegrasyonu tamamlandı. Kullanıcının cihazında tamamen lokal olarak sıfır gecikme ile (%100 gizlilik) yüz ve landmark tespiti yapılıyor.
- **Gemini LLM & Vision Entegrasyonu:** 
  - **Prompt Genişletme:** Kullanıcının temel stil istemini (ör: "kısa dalgalı sarı saç") saniyeler içinde hiper-gerçekçi sanat istemlerine çeviren LLM katmanı devrede.
  - **Neural Inpainting (Gemini 2.5):** Modelin "In-context segmentation" yeteneği kullanılarak hedef saç alanının vizyon modelleri aracılığıyla modifiye edilmesi sağlandı. 
  - **API Key Güvenliği:** Anahtarlar sunucu seviyesindeki çevre değişkenleri (`process.env`) ile güvenli bir şekilde saklanıyor.

---

## 🟡 GELECEK ADIMLAR VE YAPILACAKLAR (ROADMAP)

### FAZ 2: Milimetrik Maskeleme (SAM & Özel Backend Entegrasyonu)
Saç boyama ve kesme simülasyonlarında arkaplan/yüz bozulmalarını sıfıra indirmek için özel maskeleme hattı eklenecek.
- **Python FastAPI API:** Görüntü işleme yükünü tarayıcıdan alacak yüksek performanslı backend mimarisinin kurulması.
- **Segment Anything (SAM) Devreye Alınması:** Kullanıcının kafa formundan sadece saçlık bölgeyi piksel piksel algılayacak "Hard Mask" (Sert Maske) sisteminin kurulması. 

### FAZ 3: Hareketli Video Üretimi (Google Veo)
Fotoğrafın ötesine geçerek kullanıcının o saçla hareketli halini simüle etmek.
- **Veo Gen-AI Entegrasyonu:** Üretilen başarılı 2D görselin (referans) Google Veo'ya veya alternatif video generatörlere beslenmesi.
- **Cinematic Head-Turn:** Kullanıcının kameraya bakarken kafasını hafif sağa ve sola çevirdiği, saçların fiziksel davranış sergilediği 3-4 saniyelik sinematik videoların oluşturulması.

### FAZ 4: Canlı 3D AR (Artırılmış Gerçeklik)
Yapay Zeka işlemesini beklemeden kullanıcının kamerada eşzamanlı olarak saçı kafasında görmesi.
- **Three.js ve WebGL Optimizasyonu:** Web tabanlı 3D motorunun (Three.js) sisteme entegrasyonu.
- **3D Asset Eşleştirme (Anchoring):** Harici kütüphanelerden çekilen `.glb` / `.fbx` saç modellerinin MediaPipe kafesi (Mesh) üzerindeki çapa noktalarına bağlanarak kullanıcının kafa hareketleriyle gerçek zamanlı dönmesinin sağlanması.

### FAZ 5: Son Kullanıcı Özellikleri ve Işık/Fizik Motoru
- **Lighting Match (Işık Eşleştirme):** Yeni takılan 3D saçın veya üretilen 2D görseldeki saçın, kullanıcının odasındaki/ortamındaki gerçek ortam ışığı tonlarına uyarlanması.
- **Kullanıcı Kayıt Sistemi:** Firebase / Supabase ile kullanıcıların kendi tarama verilerini ve üretilmiş saç tasarımlarını kaydetmesi.
- **Local AI Processing (Opsiyonel):** Özellikle senin gibi kuvvetli (RTX 4070 vb.) donanımlara sahip tasarımcıların/geliştiricilerin, maliyetli API çağrıları yapmak yerine SAM maskelemelerini ve Stable Diffusion Inpainting'i bilgisayarlarında "Local Inference" olarak çalıştırabileceği bir Worker node geliştirmesi.
