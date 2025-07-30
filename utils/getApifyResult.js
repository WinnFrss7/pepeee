import { ApifyClient } from 'apify-client';

// Initialize once
const client = new ApifyClient({
    token: process.env.APIFY_API_TOKEN,
});
console.log('ENV')
console.log(process.env.APIFY_API_TOKEN)

// Utility: wait for actor run to finish
async function waitForRunToFinish(runId, interval = 10000, timeout = 180000) {
    const start = Date.now();

    while (true) {
        const { status } = await client.run(runId).get();
        if (status === 'SUCCEEDED') return;
        if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
            throw new Error(`Run failed with status: ${status}`);
        }

        if (Date.now() - start > timeout) {
            throw new Error('Timeout while waiting for actor to finish');
        }

        await new Promise((res) => setTimeout(res, interval));
    }
}

// Main function to export
export async function getApifyResult(user) {
    try {
        // Start the Apify task (but it might not be finished yet)
        const run = await client.task('IihgmGu5kT3xmDwwo').call({qs_data: user});

        // Wait until the run has completed
        await waitForRunToFinish(run.id);

        // Now safely fetch the dataset
        const { items } = await client.dataset(run.defaultDatasetId).listItems();

        if (!items.length) {
            throw new Error('No results found in dataset.');
        }

        return items;
    } catch (error) {
        console.error('Error fetching Apify result:', error.message);
        throw error;
    }
}
