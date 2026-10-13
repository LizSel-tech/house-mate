declare module '@paystack/inline-js' {
  type PaystackPopupResponse = { reference: string; status: string; trans?: string; message?: string };

  export default class PaystackPop {
    resumeTransaction(
      accessCode: string,
      callbacks?: {
        onSuccess?: (response: PaystackPopupResponse) => void;
        onCancel?: () => void;
        onLoad?: () => void;
        onError?: (error: { message: string }) => void;
      },
    ): unknown;
  }
}
