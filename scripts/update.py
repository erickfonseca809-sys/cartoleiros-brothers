#!/usr/bin/env python3
import json, os, time
from datetime import datetime, timezone
from urllib.request import Request, urlopen
API="https://api.cartola.globo.com"
TEAMS=[
(822609,"ARJ 26 F.C","Fabio Araujo"),(328768,"Furious ScorpionS","LeH Borba"),(25462945,"SP Tri-Mundial 2005","Leandro"),(25835524,"Real TitoHenrique 8","Thiago Henrique"),(25859656,"Fonseca'sClub","Fonseca"),(28784388,"Aicitel de Latiffa","Leticia Fonseca"),(4335282,"Makukos F.C","Markinhos"),(27099138,"Paris Saint Ângela","Samuel"),(29289498,"Estrela de Atibaia","Yuri Almeida"),(2228212,"Esther 2022","Ugo Godoi"),(340516,"Club XV de Quatorze","Daniel Guedes"),(50097469,"FC.BlackandWhite","Lara Felix"),(8699275,"Bazsant FC","Jhones Bazilio"),(49133730,"MOURTOLA FC","Guilherme Moura"),(49150912,"Milan AFCP","Rafael Francisco"),(50987989,"vinicius boca junior","Vinicius Oliveira so"),(727526,"B.L.S Camisa 10","Bruno"),(25860015,"Atletico Oyatsu","Gustavo Teixeira"),(996837,"Jumentus Dortmund","Caah Himalaia"),(49637294,"Gustxxxvv","Gustavo Ribeiro")]
def api(path, authenticated=False):
 headers={"User-Agent":"Mozilla/5.0 CartoleirosBrothers","Accept":"application/json"}
 if authenticated and os.environ.get("CARTOLA_COOKIE"):
  headers["Cookie"]=os.environ["CARTOLA_COOKIE"]
 req=Request(API+path,headers=headers)
 with urlopen(req,timeout=25) as r:return json.loads(r.read().decode())
def n(x):
 try:return float(x or 0)
 except:return 0.0
def roster_points(tm):
 aa=tm.get("atletas") or [];s=sum(n(a.get("pontuacao")) for a in aa);cap=str(tm.get("capitao_id",""))
 for a in aa:
  if str(a.get("atleta_id",a.get("id","")))==cap:s+=n(a.get("pontuacao"));break
 return s
def main():
 status=api("/mercado/status");rnd=int(status.get("rodada_atual") or 1)
 try:
  live_raw=api("/atletas/pontuados").get("atletas") or {}
  if isinstance(live_raw,list): live_raw={str(a.get("atleta_id",a.get("id",""))):a for a in live_raw}
  elif isinstance(live_raw,dict): live_raw={str(k):v for k,v in live_raw.items()}
  else: live_raw={}
 except Exception as e:print("Parciais indisponíveis:",e);live_raw={}
 # Pontos Corridos: agenda completa até a rodada 38 (API da competição)
 points_competition={"rounds":{str(r):[] for r in range(1,39)},"teams":{},"standings":[]}
 try:
  comp=api("/auth/competicoes/pontoscorridos/slug/d5j7miik58ms73dbfmc0",authenticated=True)
  team_map={}
  for bucket in (comp.get("participantes") or {},comp.get("convidados") or {}):
   for team in bucket.values():
    team_map[str(team.get("time_id"))]=team.get("nome") or team.get("nome_cartola") or str(team.get("time_id"))
  points={}
  for round_key, matches in (comp.get("confrontos") or {}).items():
   try:r=int(round_key)
   except:continue
   if 1<=r<=38:
    normalized=[]
    for m in matches:
     h=m.get("mandante") or {};a=m.get("visitante") or {}
     hid=str(h.get("id"));aid=str(a.get("id"))
     hp=h.get("pontos_conquistados");ap=a.get("pontos_conquistados")
     normalized.append({"homeId":hid,"awayId":aid,"homeScore":h.get("pontuacao_rodada"),"awayScore":a.get("pontuacao_rodada"),"homePts":hp,"awayPts":ap})
     for tid in (hid,aid):
      if tid not in points:points[tid]={"points":0,"wins":0,"draws":0,"losses":0,"sg":0}
     if hp is not None and ap is not None:
      points[hid]["points"]+=int(hp);points[aid]["points"]+=int(ap)
      points[hid]["sg"]+=n(h.get("pontuacao_rodada"))-n(a.get("pontuacao_rodada"))
      points[aid]["sg"]+=n(a.get("pontuacao_rodada"))-n(h.get("pontuacao_rodada"))
      if hp==3:points[hid]["wins"]+=1;points[aid]["losses"]+=1
      elif ap==3:points[aid]["wins"]+=1;points[hid]["losses"]+=1
      else:points[hid]["draws"]+=1;points[aid]["draws"]+=1
    points_competition["rounds"][str(r)]=normalized
  points_competition["teams"]=team_map
  points_competition["standings"]=sorted([{"id":tid,"name":team_map.get(tid,"Time "+tid),**stats} for tid,stats in points.items()],key=lambda x:(-x["points"],-x["wins"],-x["sg"]))
  print("Pontos Corridos: agenda capturada para as rodadas 1-38.")
 except Exception as e:
  print("Pontos Corridos indisponível (sem quebrar atualização geral):",e)
 output=[]
 for i,(tid,name,owner) in enumerate(TEAMS,1):
  print(f"{i}/20 {name}",flush=True)
  try:
   profile=api(f"/time/id/{tid}")
   total=n(profile.get("pontos_campeonato"))
   count=int(profile.get("rodadas_jogadas") or max(0,rnd-1))
   missing=[]
  except Exception as e:
   print(f"Falha no histórico de {name}: {e}",flush=True)
   total=0.0;count=0;missing=list(range(1,rnd))
  try:
   tm=api(f"/time/id/{tid}/{rnd}");players=tm.get("atletas") or [];partial=0.0;ok=0;absent=0
   for a in players:
    aid=str(a.get("atleta_id",a.get("id","")));p=live_raw.get(aid)
    if p is None:absent+=1
    else:partial+=n(p.get("pontuacao"));ok+=1
   cap=str(tm.get("capitao_id",""))
   for a in players:
    if str(a.get("atleta_id",a.get("id","")))==cap:partial+=n((live_raw.get(cap) or {}).get("pontuacao"));break
   live={"points":round(partial,2),"playersCounted":ok,"playersMissing":absent,"isPartial":True,"error":None}
  except Exception as e:live={"points":0,"playersCounted":0,"playersMissing":0,"isPartial":True,"error":str(e)}
  output.append({"id":tid,"name":name,"owner":owner,"total":round(total,2),"totalWithLive":round(total+live["points"],2),"roundsCount":count,"missingRounds":missing,"live":live})
 os.makedirs("docs",exist_ok=True)
 data={"competition":"Cartoleiros Brothers","competitionId":"d5j7miik58ms73dbfmc0","season":2026,"currentRound":rnd,"marketStatus":status.get("status_mercado"),"ballRolling":status.get("bola_rolando"),"updatedAt":datetime.now(timezone.utc).isoformat(),"source":"API oficial do Cartola","teams":output,"pointsCompetition":points_competition}
 with open("docs/data.json","w",encoding="utf-8") as f:json.dump(data,f,ensure_ascii=False,indent=2)
 print(f"Concluído: {len(output)} times; rodada {rnd}.")
if __name__=="__main__":main()
