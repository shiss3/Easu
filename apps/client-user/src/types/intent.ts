export type IntentType = 'hotel_search' | 'price_compare' | 'booking_help';

export type TriggerReason = 'form_filled' | 'dwell_time' | 'repeated_action';

export interface IntentContext {
    city: string;
    dateRange: { start: string; end: string };
    keyword: string;
    filledFields: string[];
    currentPage: string;
}

export interface IntentSignal {
    type: IntentType;
    confidence: number;
    context: IntentContext;
    trigger: TriggerReason;
    message: string;
}
