
// src/app/(authenticated)/admin/finance/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Transaction, FinancialCategory, User } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle, Edit, Trash2, Loader2, TrendingUp, TrendingDown, DollarSign, BarChart, ExternalLink, Calendar, Filter, HandCoins } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { FinanceForm, type FinanceFormValues } from '@/components/finance/finance-form';
import { getTransactions, addTransaction, updateTransaction, deleteTransaction } from '@/services/financeService';
import { format, parseISO, isValid, startOfMonth, endOfMonth, startOfYear, endOfYear, getYear, getMonth, eachMonthOfInterval } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Bar, BarChart as RechartsBarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { cn } from '@/lib/utils';


const chartConfig = {
  income: { label: "Income", color: "hsl(var(--chart-2))" },
  expenses: { label: "Expenses", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;


export default function FinancePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const isSuperOrAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  useEffect(() => {
    if (!authLoading && !isSuperOrAdmin) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router, isSuperOrAdmin]);
  
  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedTransactions = await getTransactions();
      setTransactions(fetchedTransactions);
    } catch (error: any) {
      toast({ title: "Error", description: `Could not load transactions: ${error.message}`, variant: "destructive" });
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    if (user && isSuperOrAdmin) {
      fetchTransactions();
    }
  }, [user, fetchTransactions, isSuperOrAdmin]);
  
  const handleOpenForm = (transaction?: Transaction) => {
    setSelectedTransaction(transaction || null);
    setIsFormOpen(true);
  };
  
  const handleDeleteTransaction = async (transactionId: string) => {
    if (confirm("Are you sure you want to delete this transaction? This action cannot be undone.")) {
      setIsSubmitting(true);
      try {
        await deleteTransaction(transactionId);
        toast({ title: "Transaction Deleted" });
        fetchTransactions();
      } catch (error: any) {
        toast({ title: "Error", description: `Could not delete transaction: ${error.message}`, variant: "destructive" });
      }
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = async (data: FinanceFormValues) => {
    setIsSubmitting(true);
    try {
      const transactionData = { ...data, amount: parseFloat(data.amount) };
      if (selectedTransaction) {
        await updateTransaction(selectedTransaction.id, transactionData);
        toast({ title: "Transaction Updated" });
      } else {
        await addTransaction(transactionData);
        toast({ title: "Transaction Added" });
      }
      fetchTransactions();
      setIsFormOpen(false);
      setSelectedTransaction(null);
    } catch (error: any) {
      toast({ title: "Error", description: `Could not save transaction: ${error.message}`, variant: "destructive" });
    }
    setIsSubmitting(false);
  };
  
  const financialSummary = useMemo(() => {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisYearStart = startOfYear(now);

    return transactions.reduce((acc, t) => {
        const transactionDate = parseISO(t.date);
        const isThisMonth = transactionDate >= thisMonthStart;
        const isThisYear = transactionDate >= thisYearStart;

        if(t.type === 'income') {
            acc.totalIncome += t.amount;
            if(isThisMonth) acc.monthIncome += t.amount;
            if(isThisYear) acc.yearIncome += t.amount;
        } else { // expense
            acc.totalExpenses += t.amount;
            if(isThisMonth) acc.monthExpenses += t.amount;
            if(isThisYear) acc.yearExpenses += t.amount;
        }
        return acc;
    }, {
        totalIncome: 0,
        totalExpenses: 0,
        monthIncome: 0,
        monthExpenses: 0,
        yearIncome: 0,
        yearExpenses: 0,
    });
  }, [transactions]);
  
  const netBalance = financialSummary.totalIncome - financialSummary.totalExpenses;

  const monthlyChartData = useMemo(() => {
    const now = new Date();
    const currentYear = getYear(now);
    const months = eachMonthOfInterval({
        start: startOfYear(now),
        end: endOfYear(now)
    });
    
    const data = months.map(month => ({
        name: format(month, 'MMM'),
        income: 0,
        expenses: 0
    }));

    transactions.forEach(t => {
        const transactionDate = parseISO(t.date);
        if(getYear(transactionDate) === currentYear) {
            const monthIndex = getMonth(transactionDate);
            if(t.type === 'income') {
                data[monthIndex].income += t.amount;
            } else {
                data[monthIndex].expenses += t.amount;
            }
        }
    });

    return data;
  }, [transactions]);


  if (authLoading || isLoading || !user || !isSuperOrAdmin) {
    return <div className="flex items-center justify-center h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  
  return (
    <div className="container mx-auto py-4 sm:py-8 space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">Finance Dashboard</h1>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenForm()} className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Transaction
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedTransaction ? "Edit" : "Add"} Transaction</DialogTitle>
            </DialogHeader>
            <FinanceForm
              transaction={selectedTransaction}
              onSubmit={handleFormSubmit}
              onCancel={() => setIsFormOpen(false)}
              isLoading={isSubmitting}
            />
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground text-green-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-green-600">LKR {financialSummary.yearIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <p className="text-xs text-muted-foreground">+LKR {financialSummary.monthIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} this month</p>
            </CardContent>
        </Card>
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground text-red-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-red-600">LKR {financialSummary.yearExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <p className="text-xs text-muted-foreground">+LKR {financialSummary.monthExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} this month</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-primary">
                    LKR {netBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">Overall Profit / Loss</p>
            </CardContent>
        </Card>
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Upcoming Budgets</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                 <div className="text-2xl font-bold">LKR 0.00</div>
                <p className="text-xs text-muted-foreground">Feature coming soon</p>
            </CardContent>
        </Card>
      </div>

      {/* Charts and Transaction List */}
      <div className="grid gap-6 md:grid-cols-5">
        <Card className="md:col-span-3">
             <CardHeader>
                <CardTitle className="flex items-center"><BarChart className="mr-2 h-5 w-5 text-primary"/>Income vs. Expenses ({getYear(new Date())})</CardTitle>
             </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-[200px] sm:h-[250px] w-full">
                    <ResponsiveContainer>
                        <RechartsBarChart accessibilityLayer data={monthlyChartData}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} fontSize={12} />
                            <YAxis tickFormatter={(value) => `LKR ${Number(value) / 1000}k`} fontSize={12}/>
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="income" fill="var(--color-income)" radius={4} />
                            <Bar dataKey="expenses" fill="var(--color-expenses)" radius={4} />
                        </RechartsBarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
         <Card className="md:col-span-2">
             <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>The last 5 income/expense entries.</CardDescription>
             </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {transactions.slice(0, 5).map((t) => (
                        <div key={t.id} className="flex items-center">
                            <div className="p-2 bg-muted rounded-full mr-3">
                                {t.type === 'income' ? <TrendingUp className="h-5 w-5 text-green-500"/> : <TrendingDown className="h-5 w-5 text-red-500" />}
                            </div>
                            <div className="flex-grow">
                                <p className="font-medium text-sm">{t.category}</p>
                                <p className="text-xs text-muted-foreground">{t.source}</p>
                            </div>
                            <div className={`font-semibold text-sm ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                {t.type === 'income' ? '+' : '-'}LKR {t.amount.toLocaleString()}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
      </div>

       <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
          <CardDescription>A complete log of all financial activities.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Source/Description</TableHead>
                  <TableHead className="text-right">Amount (LKR)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{format(parseISO(t.date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      <Badge variant={t.type === 'income' ? 'secondary' : 'destructive'} className={t.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {t.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{t.category}</TableCell>
                    <TableCell className="text-muted-foreground">{t.source}</TableCell>
                    <TableCell className={`text-right font-mono ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                     <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenForm(t)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteTransaction(t.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Mobile Card View */}
          <div className="block md:hidden space-y-3">
             {transactions.map((t) => (
                <Card key={t.id} className={cn("shadow-sm", t.type === 'income' ? 'border-green-500/20' : 'border-red-500/20')}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-base font-semibold">{t.category}</CardTitle>
                        <div className={cn("font-bold text-lg", t.type === 'income' ? 'text-green-600' : 'text-red-600')}>
                            {t.type === 'income' ? '+' : '-'}LKR {t.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-1 pb-3">
                        <p className="text-sm text-muted-foreground">{t.source}</p>
                         <p className="text-xs text-muted-foreground pt-1">{format(parseISO(t.date), 'MMMM dd, yyyy')}</p>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2 pb-3 border-t pt-3">
                        <Button variant="outline" size="sm" onClick={() => handleOpenForm(t)}>
                            <Edit className="mr-1.5 h-3 w-3"/> Edit
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteTransaction(t.id)}>
                            <Trash2 className="mr-1.5 h-3 w-3"/> Delete
                        </Button>
                    </CardFooter>
                </Card>
             ))}
          </div>
          {transactions.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No transactions recorded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
