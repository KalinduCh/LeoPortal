
"use client";

import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { differenceInDays, parseISO } from 'date-fns';

// Award Winning Date: Updated to May 29, 2026 to ensure celebration is active
const AWARD_DATE = "2026-05-29";

export function CelebrationOverlay() {
    const [isVisible, setIsVisible] = useState(false);
    const [isBannerVisible, setIsBannerVisible] = useState(false);

    useEffect(() => {
        const today = new Date();
        const awardDate = parseISO(AWARD_DATE);
        const daysPassed = differenceInDays(today, awardDate);

        // Show celebration for 30 days from the award date
        if (daysPassed >= 0 && daysPassed <= 30) {
            setIsBannerVisible(true);
            
            // Check if user has already seen the full-screen celebration in this session
            const hasSeenCelebration = sessionStorage.getItem('hasSeenAwardCelebration');
            if (!hasSeenCelebration) {
                setIsVisible(true);
                sessionStorage.setItem('hasSeenAwardCelebration', 'true');
                
                // Fire confetti!
                const duration = 5 * 1000;
                const animationEnd = Date.now() + duration;
                const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

                const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

                const interval: any = setInterval(function() {
                    const timeLeft = animationEnd - Date.now();

                    if (timeLeft <= 0) {
                        return clearInterval(interval);
                    }

                    const particleCount = 50 * (timeLeft / duration);
                    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
                }, 250);
            }
        }
    }, []);

    if (!isBannerVisible) return null;

    return (
        <>
            {/* Celebration Popup */}
            {isVisible && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-500 p-4">
                    <Card className="max-w-md w-full border-2 border-yellow-500/50 shadow-2xl relative overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-[2rem]">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 via-amber-200 to-yellow-400"></div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute top-4 right-4 text-white/40 hover:text-white"
                            onClick={() => setIsVisible(false)}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                        <CardContent className="p-10 text-center space-y-6">
                            <div className="flex justify-center">
                                <div className="p-5 rounded-full bg-yellow-500/10 ring-2 ring-yellow-500/20 animate-bounce">
                                    <Trophy className="h-16 w-16 text-yellow-500" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-3xl font-black font-headline tracking-tighter uppercase leading-none">Victory for Athugalpura!</h2>
                                <p className="text-yellow-500 font-bold uppercase tracking-widest text-xs">Innovation & Excellence</p>
                            </div>
                            <div className="space-y-4 py-4">
                                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                                    <p className="font-bold text-sm">🏆 Best Innovative Project</p>
                                </div>
                                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                                    <p className="font-bold text-sm">💻 Best IT Enabled Club</p>
                                </div>
                            </div>
                            <p className="text-slate-400 text-xs leading-relaxed italic">
                                Congratulations to every Leo for their contribution to this success. We have officially been recognized at the District Level!
                            </p>
                            <Button onClick={() => setIsVisible(false)} className="w-full h-12 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-xl shadow-lg">
                                Continue to Portal
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Sticky Award Banner */}
            <div className="w-full bg-gradient-to-r from-yellow-600 via-amber-500 to-yellow-600 text-white py-2 px-4 shadow-md sticky top-0 z-[49] animate-in slide-in-from-top duration-1000">
                <div className="container mx-auto flex items-center justify-center gap-4 text-[10px] sm:text-xs font-black uppercase tracking-widest">
                    <Sparkles className="h-3 w-3 animate-pulse" />
                    <span className="hidden sm:inline">PROUD WINNERS:</span>
                    <span>Best Innovative Project</span>
                    <span className="opacity-50">|</span>
                    <span>Best IT Enabled Club</span>
                    <Trophy className="h-3 w-3 text-white" />
                </div>
            </div>
        </>
    );
}
