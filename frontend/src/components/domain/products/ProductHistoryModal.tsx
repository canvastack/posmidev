import React, { useState, useEffect } from 'react';
import { X, History, DollarSign, Package, Activity } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { historyApi } from '@/api/historyApi';
import { ProductHistoryTimeline } from './ProductHistoryTimeline';
import { PriceHistoryChart } from './PriceHistoryChart';
import { StockHistoryChart } from './StockHistoryChart';
import type { Product } from '@/types';
import type { ActivityLog, PriceHistory, StockHistory, HistoryTabType } from '@/types/history';

interface ProductHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  tenantId: string;
}

export function ProductHistoryModal({ 
  isOpen, 
  onClose, 
  product, 
  tenantId 
}: ProductHistoryModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<HistoryTabType>('all');
  
  // State for activity log
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityPage, setActivityPage] = useState(1);
  const [activityHasMore, setActivityHasMore] = useState(true);
  
  // State for price history
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [priceLoading, setPriceLoading] = useState(false);
  
  // State for stock history
  const [stockHistory, setStockHistory] = useState<StockHistory[]>([]);
  const [stockLoading, setStockLoading] = useState(false);

  // Fetch activity log
  const fetchActivityLog = async (page: number = 1) => {
    if (!tenantId || !product.id) return;
    
    setActivityLoading(true);
    try {
      const response = await historyApi.getActivityLog(tenantId, product.id, page);

      if (page === 1) {
        setActivityLog(response.data);
      } else {
        setActivityLog(prev => [...prev, ...response.data]);
      }

      setActivityHasMore(response.pagination.current_page < response.pagination.last_page);
      setActivityPage(page);
    } catch (error: any) {
      console.error('Failed to fetch activity log:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load activity history',
        variant: 'destructive',
      });
    } finally {
      setActivityLoading(false);
    }
  };

  // Fetch price history
  const fetchPriceHistory = async () => {
    if (!tenantId || !product.id) return;
    
    setPriceLoading(true);
    try {
      const response = await historyApi.getPriceHistory(tenantId, product.id);
      setPriceHistory(response.data);
    } catch (error: any) {
      console.error('Failed to fetch price history:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load price history',
        variant: 'destructive',
      });
    } finally {
      setPriceLoading(false);
    }
  };

  // Fetch stock history
  const fetchStockHistory = async () => {
    if (!tenantId || !product.id) return;
    
    setStockLoading(true);
    try {
      const response = await historyApi.getStockHistory(tenantId, product.id);
      setStockHistory(response.data);
    } catch (error: any) {
      console.error('Failed to fetch stock history:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load stock history',
        variant: 'destructive',
      });
    } finally {
      setStockLoading(false);
    }
  };

  // Load data based on active tab
  useEffect(() => {
    if (!isOpen) return;

    switch (activeTab) {
      case 'all':
        if (activityLog.length === 0) {
          fetchActivityLog(1);
        }
        break;
      case 'price':
        if (priceHistory.length === 0) {
          fetchPriceHistory();
        }
        break;
      case 'stock':
        if (stockHistory.length === 0) {
          fetchStockHistory();
        }
        break;
    }
  }, [isOpen, activeTab]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('all');
      setActivityLog([]);
      setPriceHistory([]);
      setStockHistory([]);
      setActivityPage(1);
      setActivityHasMore(true);
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 pb-4 border-b">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <History className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Product History</h2>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{product.name}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                SKU: {product.sku}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as HistoryTabType)}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="all" className="gap-2">
              <Activity className="h-4 w-4" />
              All Activity
            </TabsTrigger>
            <TabsTrigger value="price" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Price Changes
            </TabsTrigger>
            <TabsTrigger value="stock" className="gap-2">
              <Package className="h-4 w-4" />
              Stock Changes
            </TabsTrigger>
          </TabsList>

          <div className="max-h-[600px] overflow-y-auto">
            <TabsContent value="all" className="mt-0">
              <ProductHistoryTimeline 
                activities={activityLog} 
                loading={activityLoading}
              />
              {activityHasMore && !activityLoading && (
                <div className="text-center mt-6">
                  <Button
                    variant="outline"
                    onClick={() => fetchActivityLog(activityPage + 1)}
                    disabled={activityLoading}
                  >
                    Load More
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="price" className="mt-0">
              <PriceHistoryChart 
                history={priceHistory} 
                loading={priceLoading}
              />
            </TabsContent>

            <TabsContent value="stock" className="mt-0">
              <StockHistoryChart 
                history={stockHistory} 
                loading={stockLoading}
              />
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}