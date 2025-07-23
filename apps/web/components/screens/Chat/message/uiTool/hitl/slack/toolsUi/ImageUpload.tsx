import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientProject } from "@/components/screens/providers/ClientProjectProvider";
import React, { useState, useEffect } from "react";
import { XIcon } from "lucide-react";

interface ImageUploadProps {
  value?: string;
  onImageSelect: (imageUrl: string | null) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ value, onImageSelect }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<any[]>([]);
  const { selectedRequest } = useClientProject();
  const userId = selectedRequest?.userId;

  const fetchImages = async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/images?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setImages(data);
      }
    } catch (error) {
      console.error("Error fetching images:", error);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [userId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null);
  };

  const handleUpload = async () => {
    if (!file || !userId) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", userId);

      const res = await fetch("/api/images", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const newImage = await res.json();
        setImages([newImage, ...images]);
        onImageSelect(newImage.fileUrl);
        setFile(null);
      }
    } catch (error) {
      console.error("Error uploading image:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (imageId: string) => {
    try {
      const res = await fetch("/api/images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: imageId }),
      });

      if (res.ok) {
        setImages(images.filter((img) => img.id !== imageId));
        if (value === images.find((img) => img.id === imageId)?.fileUrl) {
          onImageSelect(null);
        }
      }
    } catch (error) {
      console.error("Error deleting image:", error);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>Upload a new profile image (optional)</Label>
        <div className="flex gap-2">
          <Input type="file" onChange={handleFileChange} />
          <Button onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </div>
      {value && (
        <div className="flex flex-col gap-2">
          <Label>Selected Image</Label>
          <div className="flex items-center gap-2">
            <img src={value} alt="Selected" className="w-24 h-24 rounded" />
            <Button variant="ghost" size="sm" onClick={() => onImageSelect(null)}>
              Deselect
            </Button>
          </div>
        </div>
      )}
      {images.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label>Or use an existing image</Label>
          <div className="grid grid-cols-4 gap-2">
            {images.map((image) => (
              <div key={image.id} className="relative">
                <div
                  className={`cursor-pointer border-2 ${
                    value === image.fileUrl ? "border-blue-500" : "border-transparent"
                  }`}
                  onClick={() => onImageSelect(image.fileUrl)}
                >
                  <img
                    src={image.fileUrl}
                    alt={image.fileName}
                    className="w-24 h-24 object-cover rounded"
                  />
                </div>
                <button
                  onClick={() => handleDelete(image.id)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <XIcon className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload; 