// src/app/(authenticated)/documents/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { Document as DocumentType } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle, Download, Trash2, FileText, Loader2 } from "lucide-react";
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { getDocuments, deleteDocument } from '@/services/documentService';
import { DocumentUploadForm } from '@/components/documents/document-upload-form';

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default function DocumentManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedDocuments = await getDocuments();
      setDocuments(fetchedDocuments);
    } catch (error: any) {
      console.error("Failed to fetch documents:", error);
      toast({ title: "Error", description: `Could not load documents: ${error.message}`, variant: "destructive" });
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);
  
  const handleDelete = async (documentId: string, storagePath: string, documentName: string) => {
    if (confirm(`Are you sure you want to delete "${documentName}"? This action cannot be undone.`)) {
      try {
        await deleteDocument(documentId, storagePath);
        toast({ title: "Document Deleted", description: `"${documentName}" has been successfully deleted.` });
        fetchDocuments(); // Refresh the list
      } catch (error: any) {
        console.error(`Failed to delete document with ID ${documentId}:`, error);
        toast({ title: "Error Deleting Document", description: `Could not delete the document. Error: ${error.message}`, variant: "destructive" });
      }
    }
  };

  const handleUploadComplete = () => {
    setIsFormOpen(false);
    fetchDocuments(); // Refresh list after upload
  };
  
  return (
    <div className="container mx-auto py-4 sm:py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">Club Documents</h1>
        {user?.role === 'admin' && (
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" /> Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Upload New Document</DialogTitle>
              </DialogHeader>
              <DocumentUploadForm
                onUploadComplete={handleUploadComplete}
                onCancel={() => setIsFormOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-lg sm:text-xl">
            <FileText className="mr-2 h-5 w-5 text-primary" /> Document Repository
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Download official club documents. Admins can upload new files.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : documents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Uploaded On</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.name}</TableCell>
                    <TableCell>{format(new Date(doc.uploadDate), "MMM d, yyyy")}</TableCell>
                    <TableCell>{formatBytes(doc.size)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer">
                          <Download className="mr-1 h-4 w-4" /> Download
                        </a>
                      </Button>
                      {user?.role === 'admin' && (
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(doc.id, doc.storagePath, doc.name)}>
                          <Trash2 className="mr-1 h-4 w-4" /> Delete
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">No documents have been uploaded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
