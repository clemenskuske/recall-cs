export const REPO = 'clemenskuske/recall-cs';
export const BRANCH = 'main';
export const REPO_URL = `https://github.com/${REPO}`;
export const BANK_URL = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/bank.json`;
export const REPORT_PATH = 'feedback/reports.jsonl';
export const TOKEN_SETUP_URL = 'https://github.com/settings/personal-access-tokens/new?' + new URLSearchParams({name:'Recall feedback',description:'Send question reports from my iPhone',target_name:REPO.split('/')[0],contents:'write',expires_in:'366'});
