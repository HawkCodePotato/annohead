const icons = {
  'attribute.AdditionalNeedAttributes': '/img/anno/icon_2d_mark_question_0.png',
  'attribute.Belief': '/img/anno/icon_2d_devotion_0.png',
  'attribute.FireSafety': '/img/anno/icon_2d_fire_safety_0.png',
  'attribute.Happiness': '/img/anno/icon_2d_happiness_0.png',
  'attribute.Health': '/img/anno/icon_2d_health_0.png',
  'attribute.Knowledge': '/img/anno/icon_2d_techtree_knowledge_0.png',
  'attribute.Money': '/img/anno/icon_2d_income_0.png',
  'attribute.Population': '/img/anno/icon_2d_population_0.png',
  'attribute.Prestige': '/img/anno/icon_2d_prestige_0.png',
  'common.coal':
    'data/ui/fhd/base/icon_content/production_goods/icon_3d_coal_ore_goods.png',
  'common.quest': 'data/ui/fhd/base/icon_content/generic/icon_2d_questlog.png',
  'dlc.CDLC1': 'data/ui/fhd/base/icon_content/cdlc/icon_3d_cdlc_01.png',
  'dlc.CDLC2': 'data/ui/fhd/base/icon_content/cdlc/icon_3d_cdlc_02.png',
  'dlc.CDLC3': 'data/ui/fhd/base/icon_content/cdlc/icon_3d_cdlc_03.png',
  'dlc.DLC01_Prophecies_of_Ash': '/img/anno/icon_3d_dlc_category_volcano_0.png',
  'dlc.DLC02_The_Hippodrome':
    '/img/anno/icon_3d_dlc_category_circus_maximus_0.png',
  'dlc.DLC03_Dawn_of_Delta': '/img/anno/icon_3d_dlc_category_egypt_0.png',
  'kind.Aqueduct': '/img/anno/icon_2d_aqueduct_0.png',
  'kind.City Watch': '/img/anno/icon_2d_institution_buildings_0.png',
  'kind.Harbour': '/img/anno/icon_2d_naval_buildings_0.png',
  'kind.Marsh': '/img/anno/icon_2d_category_marsh_drainage_0.png',
  'kind.Military': '/img/anno/icon_2d_category_military_buildings_0.png',
  'kind.Monument': '/img/anno/icon_2d_colloseum_0.png',
  'kind.Production': '/img/anno/icon_2d_production_buildings_0.png',
  'kind.Public Service': '/img/anno/icon_2d_category_civic_0.png',
  'kind.Residence': '/img/anno/icon_2d_category_house_0.png',
  'kind.Road': '/img/anno/icon_2d_item_scope_street_0.png',
  'niche.Agriculture': '/img/anno/niche_agriculture_0.png',
  'niche.Culture': '/img/anno/niche_culture_0.png',
  'niche.Diplomacy': '/img/anno/niche_diplomacy_0.png',
  'niche.Economy': '/img/anno/niche_economy_0.png',
  'niche.Finance': '/img/anno/niche_finance_0.png',
  'niche.Military': '/img/anno/niche_military_0.png',
  'niche.Nautics': '/img/anno/niche_nautics_0.png',
  'niche.None': '/img/anno/niche_none_0.png',
  'niche.Religion': '/img/anno/niche_religion_0.png',
  'niche.Research': '/img/anno/niche_research_0.png',
  'region.Celtic': '/img/anno/icon_2d_region_wetlands.png',
  'region.Egyptian': '/img/anno/icon_2d_region_egypt.png',
  'region.Roman': '/img/anno/icon_2d_region_heartlands.png',
  'tier.1': '/img/anno/icon_roman_numerals_1_0.png',
  'tier.2': '/img/anno/icon_roman_numerals_2_0.png',
  'tier.3': '/img/anno/icon_roman_numerals_3_0.png',
  'tier.4': '/img/anno/icon_roman_numerals_4_0.png',
  'type.Captains': '/img/anno/icon_2d_socket_item_0.png',
  'type.Charioteer':
    'data/ui/fhd/dlc02/icon_content/race_event/icon_2d_race_event_ended.png',
  'type.None': '/img/anno/icon_2d_no_allocation_0.png',
  'type.Ship': '/img/anno/icon_2d_item_ship_0.png',
  'type.Specialist': '/img/anno/icon_2d_item_none_0.png',
  'type.Villa': '/img/anno/icon_2d_item_villa_0.png',
  'ui.building': '/img/anno/icon_2d_category_house.png',
  'ui.chain': '/img/anno/icon_2d_generic_construction_chain.png',
  'ui.item': '/img/anno/icon_2d_generic_item.png',
  'ui.notFound': '/img/anno/icon_3d_sideques_roman_ruins_0.png',
  'ui.ornament':
    'data/ui/fhd/base/icon_content/construction_tools/icon_2d_ornaments.png',
  'ui.product': '/img/anno/icon_2d_generic_goods.png',
  'ui.profile': '/img/anno/icon_2d_meta_rival.png',
  'ui.quest': '/img/anno/icon_2d_questlog.png',
  'ui.tech': '/img/anno/icon_2d_research.png',
  'ui.unit': '/img/anno/icon_2d_category_military_buildings_0.png',
} as const

export function getIcon(name: keyof typeof icons) {
  return icons[name]
}

export function getIconUrl(icon: string) {
  return `${process.env.NEXT_PUBLIC_CDN_URL}/${icon}`
}
