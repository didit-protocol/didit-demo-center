"use client";

import { QRCodeSVG } from "qrcode.react";
import { Copy } from "lucide-react";
import { useState } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface QRViewerProps {
  url: string;
  status?: string | null;
}

export function QRViewer({ url, status }: QRViewerProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  return (
    <Card className="w-full rounded-xl overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
        <h3 className="text-sm font-medium text-gray-500">SESSION QR CODE</h3>
        {status && (
          <div className="text-sm text-gray-500 uppercase">
            STATUS: {status}
          </div>
        )}
      </CardHeader>
      <CardContent className="p-6 relative bg-gray-50">
        <Button
          className="absolute right-12 top-4 text-gray-500 hover:text-gray-900"
          size="icon"
          variant="ghost"
          onClick={copyToClipboard}
        >
          <Copy className="h-5 w-5" />
          <span className="sr-only">Copy URL</span>
        </Button>
        {copied && (
          <div className="absolute right-12 top-12 text-sm text-green-600">
            Copied!
          </div>
        )}
        <div className="flex justify-center p-4 rounded-lg">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <QRCodeSVG
              className="rounded"
              includeMargin={true}
              level="H"
              size={200}
              value={url}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
