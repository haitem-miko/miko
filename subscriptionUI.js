import { subscriptionManager, SUBSCRIPTION_PLANS } from './subscription.js';

let activationCallback = null;

export function showSubscriptionPlans() {
    const overlay = document.createElement('div');
    overlay.className = 'subscription-overlay';
    
    const container = document.createElement('div');
    container.className = 'subscription-container';
    
    // Create cards for each plan
    for (const [planType, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
        const card = createPlanCard(planType, plan);
        container.appendChild(card);
    }
    
    overlay.appendChild(container);
    document.body.appendChild(overlay);
    
    // Close when clicking outside
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });
}

function createPlanCard(planType, plan) {
    const card = document.createElement('div');
    card.className = `plan-card ${planType.toLowerCase()}`;
    
    const header = document.createElement('div');
    header.className = 'plan-header';
    
    const name = document.createElement('div');
    name.className = 'plan-name';
    name.textContent = plan.name;
    
    const description = document.createElement('div');
    description.className = 'plan-description';
    description.textContent = plan.description;
    
    header.appendChild(name);
    header.appendChild(description);
    
    const features = document.createElement('ul');
    features.className = 'plan-features';
    
    plan.features.forEach(feature => {
        const li = document.createElement('li');
        li.innerHTML = `<i class="fas fa-check"></i>${feature}`;
        features.appendChild(li);
    });
    
    const button = document.createElement('button');
    button.className = 'plan-button';
    button.textContent = planType === 'FREE' ? 'Current Plan' : 'Activate Plan';
    
    if (planType !== 'FREE') {
        button.addEventListener('click', () => showActivationModal(planType));
    } else {
        button.disabled = true;
    }
    
    card.appendChild(header);
    card.appendChild(features);
    card.appendChild(button);
    
    return card;
}

function showActivationModal(planType) {
    const overlay = document.createElement('div');
    overlay.className = 'subscription-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'activation-modal';
    
    const title = document.createElement('h2');
    title.textContent = `Activate ${SUBSCRIPTION_PLANS[planType].name}`;
    
    const closeButton = document.createElement('button');
    closeButton.className = 'close-button';
    closeButton.innerHTML = '<i class="fas fa-times"></i>';
    closeButton.onclick = () => overlay.remove();
    
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Enter your activation code';
    
    const buttons = document.createElement('div');
    buttons.className = 'buttons';
    
    const submitButton = document.createElement('button');
    submitButton.className = 'submit-button';
    submitButton.textContent = 'Activate';
    submitButton.onclick = () => {
        const code = input.value.trim();
        if (subscriptionManager.validateCode(code)) {
            overlay.remove();
            showSuccessMessage(`${SUBSCRIPTION_PLANS[planType].name} activated successfully!`);
            if (activationCallback) activationCallback();
        } else {
            showErrorMessage('Invalid activation code. Please try again.');
        }
    };
    
    const getCodeButton = document.createElement('button');
    getCodeButton.className = 'get-code-button';
    getCodeButton.textContent = "I don't have a code. Get one here";
    getCodeButton.onclick = () => window.open('https://www.instagram.com/haitem_hmz/', '_blank');
    
    buttons.appendChild(submitButton);
    buttons.appendChild(getCodeButton);
    
    modal.appendChild(closeButton);
    modal.appendChild(title);
    modal.appendChild(input);
    modal.appendChild(buttons);
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    input.focus();
}

function showSuccessMessage(message) {
    // Use the existing system message functionality
    const systemMessage = document.createElement('div');
    systemMessage.className = 'system-message system-notification';
    systemMessage.textContent = message;
    
    document.getElementById('chat-log').appendChild(systemMessage);
    
    setTimeout(() => systemMessage.remove(), 3000);
}

function showErrorMessage(message) {
    // Use the existing system message functionality
    const systemMessage = document.createElement('div');
    systemMessage.className = 'system-message system-notification';
    systemMessage.style.background = 'linear-gradient(135deg, rgba(220, 38, 38, 0.2) 0%, rgba(185, 28, 28, 0.2) 100%)';
    systemMessage.textContent = message;
    
    document.getElementById('chat-log').appendChild(systemMessage);
    
    setTimeout(() => systemMessage.remove(), 3000);
}

export function setActivationCallback(callback) {
    activationCallback = callback;
}