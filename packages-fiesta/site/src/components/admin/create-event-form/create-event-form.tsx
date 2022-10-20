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
    defaultValue: '2022-10-20',
  });
  const {value: mileageKm, onChange: onChangeMileage} = useField();
  const {
    value: title,
    onChange: onChangeTitle,
    setValue: setTitle,
  } = useField();

  const isValid = useMemo(() => {
    const valid =
      type === 'odometer' &&
      /^\d\d\d\d-\d\d-\d\d$/.test(date) &&
      (!mileageKm || /^[1-9]\d{0,6}$/.test(mileageKm)) &&
      title;

    return Boolean(valid);
  }, [type, date, mileageKm, title]);

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
          mileageKm: parseInt(mileageKm, 10),
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

      setTitle('');
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
