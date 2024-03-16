import {CarEvent, CarEventTypeEnum} from '@-/fiesta-types/src/data/events';
import {useField} from '@-/util-react/src/hooks/use-field';
import {observer} from 'mobx-react-lite';
import React, {FC, useCallback, useMemo} from 'react';
import {useAdminMstContext} from '../../../contexts/admin-mst';
import {CreateEventIdNotUniqueError} from '../../../state/admin/errors';

const CreateEventForm: FC<Record<string, never>> = () => {
  const store = useAdminMstContext();
  const {isActionCreationActive} = store;

  const {value: type, onChange: onChangeType} = useField({
    defaultValue: 'odometer',
  });
  const {value: date, onChange: onChangeDate} = useField({
    defaultValue: '2024-03-16',
  });
  const {value: mileageKm, onChange: onChangeMileage} = useField();
  const {value: addFuelLiters, onChange: onChangeAddFuelLiters} = useField();
  const {value: title, onChange: onChangeTitle} = useField();

  const isValid = useMemo(() => {
    if (mileageKm) {
      const km = Number(mileageKm);

      if (!isFinite(km) || km <= 0) {
        return false;
      }
    }

    if (type === 'fuel') {
      const liters = Number(addFuelLiters);

      if (!isFinite(liters) || liters <= 0) {
        return false;
      }
    } else if (addFuelLiters) {
      return false;
    }

    const valid = /^\d\d\d\d-\d\d-\d\d$/.test(date) && title;

    return Boolean(valid);
  }, [type, date, mileageKm, addFuelLiters, title]);

  const createEventId = useCallback(
    (counter = 0) => {
      if (!isValid) {
        return '---';
      }

      return `${date}:${String(counter).padStart(3, '0')}:${mileageKm.padStart(
        7,
        '0',
      )}:${type}`;
    },
    [isValid, type, date, mileageKm],
  );

  const eventId = useMemo(() => {
    return createEventId();
  }, [createEventId]);

  const onCreateClick = () => {
    const parsedType = CarEventTypeEnum.parse(type);

    (async () => {
      let counter = 0;

      while (true) {
        const event: CarEvent = {
          id: createEventId(counter),
          date,
          mileageKm: mileageKm ? Number(mileageKm) : undefined,
          addFuelLiters: addFuelLiters ? Number(addFuelLiters) : undefined,
          title,
          type: parsedType,
        };

        try {
          await store.createEvent(event);
        } catch (error) {
          if (error instanceof CreateEventIdNotUniqueError) {
            counter++;
            continue;
          }

          throw error;
        }

        break;
      }
    })().catch((error) => {
      console.error(error);
    });
  };

  return (
    <div>
      <div>
        <div>id:</div>
        <input type="text" value={eventId} disabled />
      </div>
      <div>
        <div>type:</div>
        <select value={type} onChange={onChangeType}>
          <option value="odometer">odometer</option>
          <option value="fuel">fuel</option>
          <option value="service">service</option>
          <option value="planned">planned</option>
        </select>
      </div>
      <div>
        <div>date:</div>
        <input type="text" value={date} onChange={onChangeDate} />
      </div>
      <div>
        <div>mileageKm:</div>
        <input type="text" value={mileageKm} onChange={onChangeMileage} />
      </div>
      <div>
        <div>addFuelLiters:</div>
        <input
          type="text"
          value={addFuelLiters}
          onChange={onChangeAddFuelLiters}
        />
      </div>
      <div>
        <div>title:</div>
        <input type="text" value={title} onChange={onChangeTitle} />
      </div>
      <div>
        <button
          onClick={onCreateClick}
          disabled={!isValid || isActionCreationActive}
        >
          Create
        </button>
      </div>
    </div>
  );
};

const CreateEventFormWrapped = observer(CreateEventForm);
export {CreateEventFormWrapped as CreateEventForm};
