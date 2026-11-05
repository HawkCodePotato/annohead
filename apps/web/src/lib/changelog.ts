type Release = {
  date: Date
  added?: Array<string>
  changed?: Array<string>
  fixed?: Array<string>
}

export const changelog: Array<Release> = [
  {
    added: [
      'Dawn of the Delta: the Egypt region with its buildings, goods, population tiers, production chains, research, items and questlines',
    ],
    changed: ['Game data updated to the latest patch'],
    date: new Date('2026-11-05'),
    fixed: [
      'Search finds questlines by the names their journal entries take on later, like Breadbasket for Folk Of The Great River',
      'The Egyptian region is called Aegyptus, as in the game, instead of Delta',
    ],
  },
  {
    added: ['Sign out from the profile menu in the header'],
    changed: [
      'Signing in or signing up takes you back to the page you were on',
      'Signing in with Steam shows a loading screen while your account is checked',
    ],
    date: new Date('2026-11-04'),
    fixed: [
      'The search box shows up with the page instead of popping in after',
      'Menus and tooltips no longer show calculator numbers through them',
    ],
  },
  {
    date: new Date('2026-10-07'),
    fixed: [
      'Production chains and the calculator no longer list some goods twice, like Brooches, Chariots, Cheese and Cloaks',
    ],
  },
  {
    added: [
      'Filter the calculator by chain, good or building name. The filter is saved in the link, so you can share it',
    ],
    date: new Date('2026-10-04'),
  },
  {
    changed: [
      'Production chains and the calculator have a population tier filter like the buildings page. The type filter now only lists harbour, military and materials',
    ],
    date: new Date('2026-09-30'),
  },
  {
    added: [
      'Sign in with your Steam account',
      'A page for the changelog',
      'A calculator page with every production chain side by side, filterable by region, DLC and type. Each chain links to the good it makes',
      'The calculator works offline. Once you have visited the site, opening it without internet takes you to the calculator',
      'An ornaments section with every decoration, ground pattern and wall from the ornament menu, filterable by region, menu tab and cosmetic pack. Each one shows its cost and ornament value',
      'The search box suggests matches as you type. Pick one to jump straight to its page, or press Enter for all results',
    ],
    changed: [
      'New landing page with search, every section and the language picker up front',
      'The chain calculator rounds input buildings up to how many you need to place, with the exact ratio beside it. Each building has its icon and links to its page',
      'DLC filters only list DLCs with something on that page, so the cosmetic packs no longer show up as empty options',
      'Search is faster, and only suggests near-miss spellings when nothing matches what you typed',
    ],
    date: new Date('2026-09-28'),
  },
  {
    added: [
      'Specialists show their Charioteer stats: the starting and potential range of each Hippodrome racer stat',
      'Items can be filtered by Charioteer',
      'The quest flowchart is clickable. Picking an option lights up that path, fades what it rules out, and pans to the next decision',
      'Each quest part shows its opening story',
    ],
    date: new Date('2026-09-27'),
  },
  {
    added: [
      'Goods list and pages',
      'Quests list and pages. Each questline is drawn as a flowchart showing every choice and what it leads to: costs, requirements, buffs, specialists, reputation and follow-up parts',
      'Units page for ships, troops and flagships',
      'All 12 game languages, with a language picker',
      'Specialists list every effect they have, including area effects on nearby buildings, extra output, extra workforce, input replacement and incident immunity',
      'Tooltips on region, DLC and item type icons',
    ],
    changed: [
      "Names and categories now come straight from the game's data, and buildings are grouped the way the in-game construction menu groups them",
      'Goods are classified as Good, Service, Workforce or Meta',
      'Content from unreleased DLCs is hidden, along with items the game never hands out',
      "Text that isn't translated yet falls back to English",
    ],
    date: new Date('2026-09-26'),
    fixed: [
      'Pagination jumping past the first and last pages',
      'Missing specialist icons',
      'Wrong or missing names on some modifiers',
      'Search in Chinese, Japanese and Korean',
    ],
  },
  {
    added: [
      'Technology tree and technology pages',
      'Production chain list and pages',
      'Production chain calculator',
    ],
    date: new Date('2026-09-25'),
  },
  {
    added: ['Items list and item pages'],
    date: new Date('2026-09-22'),
    fixed: ['Long text overflowing lists and search results'],
  },
  {
    added: [
      'Building pages',
      'Building construction phases and unlock requirements',
    ],
    date: new Date('2026-09-20'),
  },
  {
    added: [
      'Accounts and comments',
      'Search with filters',
      'Buildings list with filters for DLC, region and population tier',
      'German translation',
    ],
    date: new Date('2026-09-19'),
    fixed: ['Search box not working on some pages'],
  },
  {
    added: ['Annohead launched'],
    changed: [
      'Game data updated to the latest game patch',
      'Monument construction phases are no longer listed as separate buildings',
    ],
    date: new Date('2026-09-18'),
  },
  {
    added: [
      'Game data extracted from Anno 117: buildings, production chains, items, goods, quests and technologies, with their icons',
    ],
    date: new Date('2026-09-09'),
  },
]
