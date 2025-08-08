-- Add missing INSERT and UPDATE policies for subscriptions
CREATE POLICY "Users can insert their own subscription" ON public.subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription" ON public.subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Add missing INSERT and UPDATE policies for usage tracking  
CREATE POLICY "Users can insert their own usage tracking" ON public.usage_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage tracking" ON public.usage_tracking
  FOR UPDATE USING (auth.uid() = user_id);

-- Add missing INSERT policy for payment history
CREATE POLICY "Users can insert their own payment history" ON public.payment_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);