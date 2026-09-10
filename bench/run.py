import argparse,json
from datetime import datetime,timezone
from pathlib import Path
from time import perf_counter

class DryAdapter:
    def generate(self, task, condition):
        return {"text":"DRY_RUN","structured_plan_valid":None,"audio_generated":None,"language":None,"delivery_instructions":None}

def run(tasks:Path, output:Path, condition:str, adapter=None):
    adapter=adapter or DryAdapter(); output.parent.mkdir(parents=True,exist_ok=True)
    with tasks.open(encoding="utf-8") as source, output.open("w",encoding="utf-8") as destination:
        for line in source:
            if not line.strip(): continue
            task=json.loads(line); begin=perf_counter(); error=None; success=True
            try: artifact=adapter.generate(task,condition)
            except Exception as exc: artifact={}; error=f"{type(exc).__name__}: {exc}"; success=False
            destination.write(json.dumps({"task_id":task["id"],"category":task["category"],"condition":condition,"started_at":datetime.now(timezone.utc).isoformat(),"latency_ms":(perf_counter()-begin)*1000,"success":success,"error":error,"artifact":artifact,"comprehension":None,"recall":None})+"\n")

def main():
    parser=argparse.ArgumentParser(); parser.add_argument("--tasks",type=Path,default=Path("bench/tasks.jsonl")); parser.add_argument("--output",type=Path,required=True); parser.add_argument("--condition",choices=["A","B","C","D"],required=True); args=parser.parse_args(); run(args.tasks,args.output,args.condition)
if __name__=="__main__": main()
