// Subscription Plans Configuration
const SUBSCRIPTION_PLANS = {
    FREE: {
        name: 'Free Plan',
        images_per_batch: 1,
        cooldown_seconds: 4,
        daily_limit: 5,
        description: 'Basic access with limited features',
        features: [
            'Generate 1 image every 4 seconds',
            'Maximum 5 images per day',
            'No activation code needed'
        ]
    },
    USI: {
        name: 'USI Plan',
        images_per_batch: 4,
        cooldown_seconds: 4,
        daily_limit: 50,
        description: 'Enhanced access for USI members',
        features: [
            'Generate 4 images every 4 seconds',
            'Up to 50 images per day',
            'Priority processing',
            'Higher quality results'
        ]
    },
    VIP: {
        name: 'VIP Plan',
        images_per_batch: 4,
        cooldown_seconds: 4,
        daily_limit: Infinity,
        description: 'Unlimited premium access',
        features: [
            'Generate 4 images every 4 seconds',
            'Unlimited image generation',
            'Highest priority processing',
            'Maximum quality settings'
        ]
    }
};

// Valid activation codes
const VALID_CODES = {
    'USI': new Set([
        'USI-HAI-001', 'USI-HAI-002', 'USI-HAI-003', 'USI-HAI-004', 'USI-HAI-005',
        'USI-HAI-006', 'USI-HAI-007', 'USI-HAI-008', 'USI-HAI-009', 'USI-HAI-010'
    ]),
    'VIP': new Set([
        'VIP-HMZ-001', 'VIP-HMZ-002', 'VIP-HMZ-003', 'VIP-HMZ-004', 'VIP-HMZ-005',
        'VIP-HMZ-006', 'VIP-HMZ-007', 'VIP-HMZ-008', 'VIP-HMZ-009', 'VIP-HMZ-010'
    ])
};

class SubscriptionManager {
    constructor() {
        this.currentPlan = 'FREE';
        this.dailyCount = 0;
        this.lastGenerated = 0;
        this.loadSubscription();
    }

    loadSubscription() {
        const saved = localStorage.getItem('subscription');
        if (saved) {
            const data = JSON.parse(saved);
            this.currentPlan = data.plan;
            this.dailyCount = this.isDifferentDay(data.lastUpdated) ? 0 : data.dailyCount;
            this.lastGenerated = data.lastGenerated;
        }
    }

    saveSubscription() {
        localStorage.setItem('subscription', JSON.stringify({
            plan: this.currentPlan,
            dailyCount: this.dailyCount,
            lastGenerated: this.lastGenerated,
            lastUpdated: new Date().toISOString()
        }));
    }

    isDifferentDay(lastUpdated) {
        if (!lastUpdated) return true;
        const last = new Date(lastUpdated);
        const now = new Date();
        return last.getDate() !== now.getDate() || 
               last.getMonth() !== now.getMonth() || 
               last.getFullYear() !== now.getFullYear();
    }

    getCurrentPlan() {
        return SUBSCRIPTION_PLANS[this.currentPlan];
    }

    validateCode(code) {
        if (VALID_CODES.USI.has(code)) {
            this.activatePlan('USI');
            return true;
        }
        if (VALID_CODES.VIP.has(code)) {
            this.activatePlan('VIP');
            return true;
        }
        return false;
    }

    activatePlan(planType) {
        this.currentPlan = planType;
        this.dailyCount = 0;
        this.saveSubscription();
    }

    canGenerateImages() {
        const plan = this.getCurrentPlan();
        const now = Date.now();
        
        // Check cooldown
        if (now - this.lastGenerated < plan.cooldown_seconds * 1000) {
            return {
                allowed: false,
                reason: `Please wait ${plan.cooldown_seconds} seconds between generations`
            };
        }

        // Check daily limit
        if (this.dailyCount >= plan.daily_limit) {
            return {
                allowed: false,
                reason: `Daily limit of ${plan.daily_limit} images reached`
            };
        }

        return {
            allowed: true,
            imagesPerBatch: plan.images_per_batch
        };
    }

    recordGeneration(imageCount) {
        this.dailyCount += imageCount;
        this.lastGenerated = Date.now();
        this.saveSubscription();
    }
}

export const subscriptionManager = new SubscriptionManager();
export { SUBSCRIPTION_PLANS };
