const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

async function main() {
  const database = new PGlite();
  try {
    await database.exec(`
      create role anon;
      create role authenticated;
      create schema auth;
      create function auth.uid() returns uuid language sql stable as
        $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
      create table public.season_members(season_id text, user_id uuid, role text);
      create table public.banquillo_teams(id text, club_id text, season_id text, archived_at timestamptz);
      create table public.banquillo_clubs(id text, owner_id uuid, deleted_at timestamptz);
      create table public.banquillo_club_directors(club_id text, user_id uuid);
      create table public.docs(season_id text, note text);
      alter table public.docs enable row level security;
      grant select, update on public.docs to authenticated;
      insert into public.banquillo_clubs values ('club-a', '00000000-0000-0000-0000-000000000001');
      insert into public.banquillo_club_directors values ('club-a','00000000-0000-0000-0000-000000000002');
      insert into public.banquillo_teams values ('team-a','club-a','season-a',null);
      insert into public.season_members values ('season-a','00000000-0000-0000-0000-000000000003','editor');
      insert into public.docs values ('season-a','ficticio'), ('season-b','ficticio');
    `);
    const sql = fs.readFileSync(path.join(__dirname,'..','supabase','permisos_directores_edicion_temporadas_20261113.sql'),'utf8');
    await database.exec(sql);
    await database.exec(`
      create policy read_docs on public.docs for select to authenticated using (true);
      create policy write_docs on public.docs for update to authenticated
        using (public.can_edit(season_id)) with check (public.can_edit(season_id));
    `);

    async function asUser(user, expected) {
      await database.exec('set role authenticated');
      try {
        await database.query("select set_config('request.jwt.claim.sub',$1,false)",
          ['00000000-0000-0000-0000-00000000000'+user]);
        const result = await database.query('select public.can_edit($1) as allowed',['season-a']);
        assert.equal(result.rows[0].allowed,expected);
        const update = await database.query("update public.docs set note='actualizado' returning season_id");
        assert.deepEqual(update.rows.map(row=>row.season_id),expected?['season-a']:[]);
      } finally {
        await database.exec('reset role');
      }
    }

    for (const user of [1,2,3]) await asUser(user,true);
    await asUser(4,false);
    const acl = await database.query("select has_function_privilege('anon','public.can_edit(text)','EXECUTE') as allowed");
    assert.equal(acl.rows[0].allowed,false);
    await database.exec("update public.banquillo_teams set archived_at=now() where id='team-a'");
    await asUser(2,false);
    await database.exec("update public.banquillo_teams set archived_at=null where id='team-a'");
    await database.exec("delete from public.banquillo_club_directors where club_id='club-a'");
    await asUser(2,false);
    console.log('OK PostgreSQL aislado: directores, entrenador, cuenta ajena, archivo y revocación.');
  } finally {
    await database.close();
  }
}

main().catch(error=>{console.error(error);process.exitCode=1;});
