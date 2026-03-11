export interface Profile {
    name?: string;
    email?: string;
    phone: string;
}

export interface Session {
    token: string;
    profile: Profile;
}

export interface AndroidPushSubscription {
    token?: string;
    model?: string;
    manufacturer?: string;
    os?: string;
}

export interface UserPushSubscription {
    web?: PushSubscriptionJSON;
    fcm?: AndroidPushSubscription
}

