"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function RedirectToUnifiedSubmissions() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/admin/submissions');
    }, [router]);

    return (
        <div className="flex h-[80vh] items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
}