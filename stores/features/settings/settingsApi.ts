import { createApiEndpoints } from "@/stores/baseApi";

export type SecurityPinType = "void" | "expense";

export interface CashierStatusVisibility {
  cashierShowOpen: boolean;
  cashierShowPaidToWaiter: boolean;
  cashierShowPaidToCashier: boolean;
  cashierShowWithoutPrint: boolean;
  cashierShowVoided: boolean;
  cashierShowDisputed: boolean;
  cashierShowConfirmed: boolean;
}

export type CashierHistoryDefaultTab = "waiter" | "owner";

export interface CashierPermissions {
  cashierCanEditMenus: boolean;
  cashierCanEditCategories: boolean;
  cashierCanEditInventory: boolean;
}

export interface AppSettings
  extends CashierPermissions,
    CashierStatusVisibility {
  voidPinConfigured: boolean;
  expensePinConfigured: boolean;
  cashierHistoryDefaultTab: CashierHistoryDefaultTab;
}

export type CashierSettingsUpdate = Partial<
  CashierPermissions &
    CashierStatusVisibility & {
      cashierHistoryDefaultTab: CashierHistoryDefaultTab;
    }
>;

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const settingsApi = createApiEndpoints({
  endpoints: (build) => ({
    getSettings: build.query<AppSettings, void>({
      query: () => ({
        url: "/settings",
        method: "GET",
      }),
      transformResponse: (response: ApiResponse<AppSettings>) => response.data,
      providesTags: ["SecurityPins"],
    }),

    getSecurityPins: build.query<AppSettings, void>({
      query: () => ({
        url: "/settings/security-pins",
        method: "GET",
      }),
      transformResponse: (response: ApiResponse<AppSettings>) => response.data,
      providesTags: ["SecurityPins"],
    }),

    updateSecurityPins: build.mutation<
      AppSettings,
      { voidPin?: string; expensePin?: string }
    >({
      query: (body) => ({
        url: "/settings/security-pins",
        method: "PUT",
        body,
      }),
      transformResponse: (response: ApiResponse<AppSettings>) => response.data,
      invalidatesTags: ["SecurityPins"],
    }),

    updateCashierPermissions: build.mutation<
      AppSettings,
      CashierSettingsUpdate
    >({
      query: (body) => ({
        url: "/settings/cashier-permissions",
        method: "PUT",
        body,
      }),
      transformResponse: (response: ApiResponse<AppSettings>) => response.data,
      invalidatesTags: ["SecurityPins"],
    }),

    verifySecurityPin: build.mutation<
      { valid: boolean },
      { type: SecurityPinType; pin: string }
    >({
      query: (body) => ({
        url: "/settings/security-pins/verify",
        method: "POST",
        body,
      }),
      transformResponse: (response: ApiResponse<{ valid: boolean }>) =>
        response.data,
    }),
  }),
});

export const {
  useGetSettingsQuery,
  useGetSecurityPinsQuery,
  useUpdateSecurityPinsMutation,
  useUpdateCashierPermissionsMutation,
  useVerifySecurityPinMutation,
} = settingsApi;
