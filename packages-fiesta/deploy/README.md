# Fiesta deploy

- Copy `src/ansible/inventory.example.ini` to `src/ansible/inventory.ini`
- Copy `src/ansible/vars.example.yml` to `src/ansible/vars.yml`
- Fill needed values, add `[prod]` inventory item

For frontend update run:

```
cd src/ansible

DEPLOY_HOSTS=prod ansible-playbook -i inventory.ini release-static.yml
```
