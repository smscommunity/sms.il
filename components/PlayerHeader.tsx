import PlayerData from '../types/PlayerData';

export interface PlayerHeaderProps {
    data: PlayerData;
}

export default function PlayerHeader(props: PlayerHeaderProps) {
    const { name, medals, points, submissions, comment } = props.data;
    return (
        <div>
            <div>
                <span>{name}</span>
            </div>
            <div>
                <span>{points + ' points over ' + submissions + ' submissions'}</span>
            </div>
        </div>
    );
}
