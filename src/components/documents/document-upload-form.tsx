// src/components/documents/document-upload-form.tsx
"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Importing the service function
import { uploadDocument } from '@/services/documentService';

const documentFormSchema = z.object({
  name: z.string().min(3, { message: "Document name must be at least 3 characters." }),
  file: z
    .instanceof(FileList)
    .refine((files) => files?.length === 1, 'File is required.'),
});

export type DocumentFormValues = z.infer<typeof documentFormSchema>;

interface DocumentUploadFormProps {
  onUploadComplete: () => void;
  onCancel: () => void;
}

export function DocumentUploadForm({ onUploadComplete, onCancel }: DocumentUploadFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const form = useForm<DocumentFormValues>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: {
      name: "",
    },
  });

  const onSubmit = async (data: DocumentFormValues) => {
    setIsLoading(true);
    try {
      const file = data.file[0];
      await uploadDocument(file, data.name);
      toast({
        title: "Upload Successful",
        description: `"${data.name}" has been uploaded.`,
      });
      onUploadComplete();
    } catch (error: any) {
      console.error("Failed to upload document:", error);
      toast({
        title: "Upload Failed",
        description: `Could not upload the document: ${error.message}`,
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };
  
  const fileRef = form.register("file");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Document Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Monthly Report - May 2024" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="file"
          render={({ field }) => (
            <FormItem>
              <FormLabel>File</FormLabel>
              <FormControl>
                <Input type="file" {...fileRef} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Upload Document
          </Button>
        </div>
      </form>
    </Form>
  );
}
