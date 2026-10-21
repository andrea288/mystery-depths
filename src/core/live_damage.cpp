#include <cstdint>
#include <string>
#include <iterator>
#ifdef __EMSCRIPTEN__
#include <emscripten/bind.h>
#else
#include <iostream>
#endif
#include "cfgparse.hpp"
#include "idmap.hpp"

static uint32_t live_state = 1;
static uint32_t live_calls = 0;
int32_t md_rand_int(int32_t end) {
    live_state = live_state * 0x5d588b65u + 1u;
    ++live_calls;
    return uint32_t((live_state >> 16) * uint32_t(end)) >> 16;
}

std::string single_damage(std::string input) {
    using nlohmann::json;
    try {
        auto cfg = json::parse(input);
        live_state = cfg.at("rngState").get<uint32_t>();
        live_calls = 0;
        auto [dungeon, attacker, defender, move, projectile] = parse_cfg(cfg);
        DamageData result;
        const auto damage = simulate_damage_calc(result, dungeon, attacker, defender, move);
        return json{{"damage",damage},{"critical",result.critical_hit},
                    {"healed",result.healed},{"noDamage",result.no_damage},
                    {"matchup",int(result.type_matchup)},
                    {"rngState",live_state},{"rngCalls",live_calls},
                    {"missed",dungeon.damage_calc.first_hit_check_failed}}
                    .dump();
    } catch (const std::exception& e) { return json{{"error",e.what()}}.dump(); }
}

std::string core_catalog() {
    using nlohmann::json;
    json output = {{"moves",json::object()},{"species",json::object()}};
    for (const auto& name : ids::MOVE.all_except()) {
        const auto id = ids::MOVE[name];
        if (unsigned(id) >= std::size(mechanics::data_files::MOVES)) continue;
        const auto& move = mechanics::data_files::MOVES[id];
        output["moves"][name] = {{"id",int(id)},{"power",move.base_power},{"pp",move.pp},
          {"type",ids::TYPE[move.type]},{"category",ids::MOVE_CATEGORY[move.category]},
          {"accuracy1",move.accuracy1},{"accuracy2",move.accuracy2},{"strikes",move.strikes},
          {"critChance",move.crit_chance},{"unsupported",move.unsupported}};
    }
    for (const auto& name : ids::MONSTER.all_except()) {
        auto id = ids::MONSTER[name];
        if (unsigned(id) >= std::size(mechanics::data_files::MONSTERS)) continue;
        const auto& mon = mechanics::data_files::MONSTERS[id];
        output["species"][name]={{"id",int(id)},{"types",{ids::TYPE[mon.type1],ids::TYPE[mon.type2]}},
          {"abilities",{ids::ABILITY[mon.ability1],ids::ABILITY[mon.ability2]}}};
    }
    return output.dump();
}
#ifdef __EMSCRIPTEN__
EMSCRIPTEN_BINDINGS(mystery_depths) {
    emscripten::function("singleDamage", &single_damage);
    emscripten::function("catalog", &core_catalog);
}
#else
int main(int argc, char** argv) {
    if (argc > 1 && std::string(argv[1]) == "catalog") { std::cout << core_catalog(); return 0; }
    std::string line;
    while (std::getline(std::cin, line)) std::cout << single_damage(line) << '\n';
}
#endif
