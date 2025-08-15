// src/components/finance/finance-form.tsx
"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Loader2 } from 'lucide-react';
import type { Transaction } from '@/types';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { FINANCIAL_CATEGORIES } from '@/services/financeService';

const financeFormSchema = z.object({
  type: z.enum(['income', 'expense'], { required_error: "Transaction type is required." }),
  date: z.date({ required_error: "Date is required." }),
  amount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Amount must be a positive number.",
  }),
  category: z.string().min(1, { message: "Category is required." }),
  source: z.string().min(2, { message: "Source/Description must be at least 2 characters." }),
  notes: z.string().optional(),
});

export type FinanceFormValues = z.infer<typeof financeFormSchema>;

interface FinanceFormProps {
  transaction?: Transaction | null;
  onSubmit: (data: FinanceFormValues) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function FinanceForm({ transaction, onSubmit, onCancel, isLoading }: FinanceFormProps) {
  const form = useForm<FinanceFormValues>({
    resolver: zodResolver(financeFormSchema),
    defaultValues: {
      type: transaction?.type || 'expense',
      date: transaction?.date ? parseISO(transaction.date) : new Date(),
      amount: transaction?.amount.toString() || '',
      category: transaction?.category || '',
      source: transaction?.source || '',
      notes: transaction?.notes || '',
    },
  });

  const transactionType = form.watch('type');
  const categories = FINANCIAL_CATEGORIES[transactionType];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant="outline" className={cn(!field.value && "text-muted-foreground")}>
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (LKR)</FormLabel>
              <FormControl><Input type="number" step="0.01" placeholder="5000.00" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder={`Select a ${transactionType} category`} /></SelectTrigger></FormControl>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="source"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Source / Description</FormLabel>
              <FormControl><Input placeholder={transactionType === 'income' ? "e.g., Member Dues, Bake Sale" : "e.g., Venue Rental, Printing Costs"} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl><Textarea placeholder="Any additional details..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>Cancel</Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {transaction ? "Save Changes" : "Add Transaction"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
