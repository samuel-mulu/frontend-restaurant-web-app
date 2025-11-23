import { logout, markHydrated, setToken, setUser } from "./authSlice";
import {
  ApiLoginResponse,
  ApiProfileResponse,
  LoginRequest,
  User,
} from "@/types/auth";
import { createApiEndpoints } from "@/stores/baseApi";

export const authApi = createApiEndpoints({
  endpoints: (build) => ({
    createStaff: build.mutation<
      { success: boolean; message: string; data?: User },
      {
        name: string;
        email?: string;
        password: string;
        role?: "cashier" | "waiter";
        phone: string;
      }
    >({
      query: (body) => ({
        url: "auth/create-staff",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Auth"],
    }),

    login: build.mutation<ApiLoginResponse, LoginRequest>({
      query: (body) => ({
        url: "auth/login",
        method: "POST",
        body: { ...body },
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          console.log("Login API Response:", data);
          if (data?.success && data.data) {
            const user = data.data.user;

            // Set access token
            if (data.data.accessToken) {
              dispatch(setToken(data.data.accessToken));
            }

            // Set user data (matching API structure exactly)
            dispatch(
              setUser({
                id: String(user.id),
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
              })
            );
            dispatch(markHydrated());
          }
        } catch {
          // Error handling is done in the component
        }
      },
      invalidatesTags: ["Auth"],
    }),

    refresh: build.mutation<
      { success: boolean; message: string; data?: { accessToken: string } },
      void
    >({
      query: () => ({
        url: "auth/refresh",
        method: "POST",
        credentials: "include",
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data?.success && data.data?.accessToken) {
            dispatch(setToken(data.data.accessToken));
          }
        } catch {
          // Error handling
        }
      },
    }),

    logout: build.mutation<void, void>({
      query: () => ({ url: "auth/logout", method: "POST" }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          dispatch(logout());
          dispatch(authApi.util.resetApiState());
          dispatch(markHydrated());
        }
      },
      invalidatesTags: ["Auth"],
    }),

    getProfile: build.query<ApiProfileResponse, void>({
      query: () => ({
        url: "auth/profile",
        method: "GET",
      }),

      transformResponse: (response: unknown): ApiProfileResponse => {
        // API profile endpoint returns user directly (not wrapped)
        const userResponse = response as {
          id?: string;
          _id?: string;
          name?: string;
          email?: string;
          phone?: string;
          role?: "owner" | "cashier" | "waiter";
          createdAt?: Date | string;
          updatedAt?: Date | string;
        };

        // If response is user object directly (has id, name, etc.)
        if (userResponse.id || userResponse._id) {
          return {
            success: true,
            data: {
              id: String(userResponse.id || userResponse._id),
              name: userResponse.name || "",
              email: userResponse.email,
              phone: userResponse.phone || "",
              role: userResponse.role || "cashier",
              createdAt: userResponse.createdAt,
              updatedAt: userResponse.updatedAt,
            },
          };
        }

        return {
          success: false,
          message: "Unauthenticated",
          data: undefined,
        };
      },
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data?.success && data.data) {
            const user = data.data;
            dispatch(
              setUser({
                id: String(user.id),
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
              })
            );
          } else {
            dispatch(setUser(null));
          }
        } catch {
        } finally {
          dispatch(markHydrated());
        }
      },
    }),

    updateProfile: build.mutation<
      { success: boolean; message: string; data?: User },
      { name?: string; email?: string; phone?: string }
    >({
      query: (body) => ({
        url: "auth/profile",
        method: "PATCH",
        body,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        if (data?.success && data.data) {
          dispatch(setUser(data.data));
        }
      },
      invalidatesTags: ["Auth"],
    }),

    changePassword: build.mutation<
      { success: boolean; message: string },
      {
        currentPassword: string;
        newPassword: string;
      }
    >({
      query: (body) => ({
        url: "auth/change-password",
        method: "PATCH",
        body: {
          currentPassword: body.currentPassword,
          newPassword: body.newPassword,
        },
      }),
      invalidatesTags: ["Auth"],
    }),

    resetStaffPassword: build.mutation<
      { success: boolean; message: string },
      { id: string; newPassword: string }
    >({
      query: ({ id, newPassword }) => ({
        url: `auth/staff/${id}/reset-password`,
        method: "PATCH",
        body: { newPassword },
      }),
      invalidatesTags: ["Auth"],
    }),

    getUsers: build.query<
      {
        success: boolean;
        message: string;
        data: Array<User>;
      },
      void
    >({
      query: () => ({
        url: "auth/users",
        method: "GET",
      }),
      providesTags: ["Auth"],
    }),

    disableUser: build.mutation<
      { success: boolean; message: string },
      { id: string }
    >({
      query: ({ id }) => ({
        url: `auth/users/${id}/disable`,
        method: "PATCH",
      }),
      invalidatesTags: ["Auth"],
    }),
  }),
});

export const {
  useCreateStaffMutation,
  useLoginMutation,
  useRefreshMutation,
  useLogoutMutation,
  useUpdateProfileMutation,
  useGetProfileQuery,
  useChangePasswordMutation,
  useResetStaffPasswordMutation,
  useGetUsersQuery,
  useDisableUserMutation,
} = authApi;
