async function submitQuizAttempt(userId, topicId, scorePercentage) {
    try {
        const response = await fetch('/api/quiz/evaluate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Include authorization header with JWT if applicable
            },
            body: JSON.stringify({ userId, topicId, scorePercentage })
        });

        const data = await response.json();
        
        if (data.success) {
            updateDashboardUI(data.tier, data.recommendation);
        } else {
            alert('Error evaluating test results.');
        }
    } catch (error) {
        console.error('Network or Server Error:', error);
    }
}

function updateDashboardUI(tier, recommendation) {
    // Dynamically update the DOM in place without a page reload
    const tierBadge = document.getElementById('current-tier-badge');
    const actionFeed = document.getElementById('recommendation-feed');

    tierBadge.textContent = `Current Tier: ${tier}`;
    actionFeed.innerHTML = `<p><strong>Action Item:</strong> ${recommendation}</p>`;
}