import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, ShieldCheck, RefreshCw, CheckCircle, AlertCircle, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/contexts/LanguageContext";

type Stage = "consent" | "requesting" | "live" | "captured" | "denied";

interface Props {
  /** Called with the captured photo (data URL) once the user accepts the shot */
  onPhoto: (dataUrl: string | null) => void;
  accentClass?: string;
}

export function PhotoChallengeCapture({
  onPhoto,
  accentClass = "from-pink-600 to-rose-600",
}: Props) {
  const { lang } = useLang();
  const [stage, setStage] = useState<Stage>("consent");
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stopStream, [stopStream]);

  const requestCamera = async () => {
    setError(null);
    setStage("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setStage("live");
      // attach after render
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch (e) {
      const name = (e as DOMException)?.name;
      setError(
        name === "NotAllowedError"
          ? "Permissão da câmara recusada. Autoriza o acesso para validar o desafio."
          : "Não foi possível abrir a câmara neste dispositivo. Podes enviar uma fotografia.",
      );
      setStage("denied");
    }
  };

  const shoot = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    stopStream();
    setPhoto(dataUrl);
    setStage("captured");
    onPhoto(dataUrl);
  };

  const onFile = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setPhoto(dataUrl);
      setStage("captured");
      onPhoto(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const retake = () => {
    setPhoto(null);
    onPhoto(null);
    requestCamera();
  };

  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <p className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1">
        <Camera className="size-3.5" /> Prova fotográfica obrigatória
      </p>

      {stage === "consent" && (
        <div className="space-y-3">
          <div className="flex gap-2 text-sm">
            <ShieldCheck className="size-5 shrink-0 text-green-700 dark:text-green-300" />
            <p className="text-muted-foreground">
              Para confirmar este desafio precisas de tirar uma fotografia no local. A app vai pedir
              permissão para usar a câmara — a foto fica no teu dispositivo e serve apenas como
              prova do desafio.
            </p>
          </div>
          <Button
            onClick={requestCamera}
            className={`w-full bg-gradient-to-r ${accentClass} text-white hover:opacity-90`}
          >
            <Camera className="size-4" /> Permitir câmara e tirar foto
          </Button>
        </div>
      )}

      {stage === "requesting" && (
        <p className="text-sm text-muted-foreground py-4 text-center">
          À espera da tua permissão para acessar a câmara...
        </p>
      )}

      {stage === "live" && (
        <div className="space-y-3">
          <div className="relative rounded-xl overflow-hidden bg-black aspect-[3/4] max-h-64 mx-auto">
            <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
          </div>
          <Button
            onClick={shoot}
            className={`w-full bg-gradient-to-r ${accentClass} text-white hover:opacity-90`}
          >
            <Camera className="size-4" /> Capturar fotografia
          </Button>
        </div>
      )}

      {stage === "captured" && photo && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-3"
        >
          <div className="relative rounded-xl overflow-hidden border">
            <img
              src={photo}
              alt={lang === "pt" ? "Prova fotográfica do desafio" : "Photo proof for the challenge"}
              className="w-full max-h-64 object-cover"
            />
            <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-green-700 text-white text-xs px-2 py-1">
              <CheckCircle className="size-3" /> Foto validada
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={retake} className="w-full">
            <RefreshCw className="size-4" /> Tirar outra
          </Button>
        </motion.div>
      )}

      {stage === "denied" && (
        <div className="space-y-3">
          <div className="flex gap-2 text-sm text-destructive">
            <AlertCircle className="size-5 shrink-0" />
            <p>{error}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={requestCamera}>
              <Camera className="size-4" /> Tentar de novo
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="size-4" /> Enviar foto
            </Button>
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
    </div>
  );
}
