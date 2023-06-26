import { Test, TestingModule } from '@nestjs/testing';
import { PayableService } from './payable.service';
import { PayableRepository } from '../../data/repositories/payable-repository/payable-repository';
import { AssignorRepository } from '../../data/repositories/assignor-repository/assignor-repository';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { BullModule, getQueueToken } from '@nestjs/bull';


const makeFakePayable = () => ({
  id: 'any_id',
  assignorId: 'any_assignor_id',
  emissionDate: 'any_emission_date',
  valueInCents: 10000
})

const exampleQueueMock = { add: jest.fn() };

describe('PayableService', () => {
  let sut: PayableService;
  let payableRepository: PayableRepository;
  let assignorRepository: AssignorRepository;

  beforeEach(async () => {
    
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        BullModule.registerQueue({
          name: 'payable',
        }),
      ],
      providers: [
        PayableService, 
        {
          provide: PayableRepository, 
          useValue: {
            create: jest.fn().mockResolvedValue(makeFakePayable()),
            findOne: jest.fn().mockResolvedValue(makeFakePayable()),
            findAll: jest.fn().mockResolvedValue([makeFakePayable(), makeFakePayable()]),
            update: jest.fn().mockResolvedValue(makeFakePayable()),
            remove: jest.fn()
          }
        },
        {
          provide: AssignorRepository,
          useValue: { 
            findOne: jest.fn().mockResolvedValue({id: 'any_id'}) 
          }
        }
      ],
    })
    .overrideProvider(getQueueToken('payable'))
    .useValue(exampleQueueMock)
    .compile();

    sut = module.get<PayableService>(PayableService);
    payableRepository = module.get<PayableRepository>(PayableRepository);
    assignorRepository = module.get<AssignorRepository>(AssignorRepository);
  });

  it('should be defined', () => {
    expect(sut).toBeDefined();
  });

  describe('batchCreate', () => {
    it('should throw if different assignors are provided', async () => {
      const promise = sut.batchCreate({ 
        payables: [
          makeFakePayable(), 
          {...makeFakePayable(), assignorId: 'different_assignor_id'}, 
          makeFakePayable()
        ]
      })
      await expect(promise).rejects.toThrowError(new BadRequestException('Batch operation is only permitted to the same assignor'))
    });

    it('should call repository with correct values', async () => {
      const findOneSpy = jest.spyOn(assignorRepository, 'findOne')
      
      await sut.batchCreate({ 
        payables: [
          makeFakePayable(), 
          makeFakePayable(), 
          makeFakePayable()
        ]
      })

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: makeFakePayable().assignorId
        }
      })
    });

    it('should throw if assignor not found', async () => {
      jest.spyOn(assignorRepository, 'findOne').mockResolvedValueOnce(null)
      
      const promise = sut.batchCreate({ 
        payables: [
          makeFakePayable(), 
          makeFakePayable(), 
          makeFakePayable()
        ]
      })

      await expect(promise).rejects.toThrowError(new NotFoundException('Assignor not found, operation canceled'))
    });

    it('should call payable.queue with correct values', async () => {
      await sut.batchCreate({ 
        payables: [
          makeFakePayable(), 
          makeFakePayable(), 
          makeFakePayable()
        ]
      })

      expect(exampleQueueMock.add).toHaveBeenCalledWith('batch-create', [
        makeFakePayable(), 
        makeFakePayable(), 
        makeFakePayable()
      ], { attempts: 3 })
    });

    it('should return success on success', async () => {
      const response = await sut.batchCreate({ 
        payables: [
          makeFakePayable(), 
          makeFakePayable(), 
          makeFakePayable()
        ]
      })

      expect(response).toEqual({
        success: true
      })
    });
  });

  describe('create', () => {

    it('should throw if error is forced by param', async () => {
      const promise = sut.create({
        data: {
          assignorId: 'any_assignor_id',
          emissionDate: 'any_emission_date',
          valueInCents: 10000,
          error: true
        }
      })

      await expect(promise).rejects.toThrowError(new Error('Forced Error'))
    });

    it('should call repository.findOne with correct values', async () => {
      const findOneSpy = jest.spyOn(assignorRepository, 'findOne')

      await sut.create({
        data: {
          assignorId: 'any_assignor_id',
          emissionDate: 'any_emission_date',
          valueInCents: 10000
        }
      })

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 'any_assignor_id',
          deletedAt: null
        }
      })
    });

    it('should throw if assignor not exists', async () => {
      jest.spyOn(assignorRepository, 'findOne').mockResolvedValueOnce(null)

      const promise = sut.create({
        data: {
          assignorId: 'any_assignor_id',
          emissionDate: 'any_emission_date',
          valueInCents: 10000
        }
      })

      await expect(promise).rejects.toThrowError(new UnauthorizedException('Assignor does not exist '))
    });

    it('should call repository.create with correct values', async () => {
      const createSpy = jest.spyOn(payableRepository, 'create')

      await sut.create({
        data: {
          assignorId: 'any_assignor_id',
          emissionDate: 'any_emission_date',
          valueInCents: 10000
        }
      })

      expect(createSpy).toHaveBeenCalledWith({
        assignorId: 'any_assignor_id',
        emissionDate: 'any_emission_date',
        valueInCents: 10000,
        createdBy: 'any',// TODO REMOVER
        updatedBy: 'any'
      })
    });

    it('should return a payable entity on success', async () => {
      const result = await sut.create({
        data: {
          assignorId: 'any_assignor_id',
          emissionDate: 'any_emission_date',
          valueInCents: 10000
        }
      })

      expect(result).toEqual(makeFakePayable())
    });
  });

  describe('findOne', () => {
    it('should call repository with correct values', async () => {
      const findOneSpy = jest.spyOn(payableRepository, 'findOne')
      await sut.findOne({id: 'any_id'})
      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 'any_id',
          deletedAt: null
        }
      })
    });

    it('should return a entity on success', async () => {
      const result = await sut.findOne({id: 'any_id'})
      expect(result).toEqual(makeFakePayable())
    });
  });

  describe('findAll', () => {
    it('should call repository with correct values', async () => {
      const findAllSpy = jest.spyOn(payableRepository, 'findAll')
      await sut.findAll({filters: {}, page: 1, itemsPerPage: 10})
      expect(findAllSpy).toHaveBeenCalledWith({
        where: {
          deletedAt: null
        },
        take: 10,
        skip: 0
      })
    });

    it('should call repository with correct values and filters', async () => {
      const findAllSpy = jest.spyOn(payableRepository, 'findAll')
      await sut.findAll({filters: {assignorId: 'any_assignor_id'}, page: 3, itemsPerPage: 10})
      expect(findAllSpy).toHaveBeenCalledWith({
        where: { assignorId: 'any_assignor_id', deletedAt: null},
        take: 10,
        skip: 20
      })
    });

    it('should return a entity on success', async () => {
      const result = await sut.findAll({filters: {}, page: 1, itemsPerPage: 10})
      expect(result).toEqual([makeFakePayable(), makeFakePayable()])
    });
  });

  describe('update', () => {
    it('should call repository.findOne with correct values', async () => {
      const findOneSpy = jest.spyOn(payableRepository, 'findOne')

      await sut.update({
        id: 'any_id',
        data: {
          valueInCents: 10000
        }
      })

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 'any_id',
          deletedAt: null
        }
      })
    });

    it('should throw if payable already exists', async () => {
      jest.spyOn(payableRepository, 'findOne').mockResolvedValueOnce(null)

      const promise = sut.update({
        id: 'any_id',
        data: {
          valueInCents: 10000
        }
      })

      await expect(promise).rejects.toThrowError(new UnauthorizedException('Payable not found'))
    });

    it('should call repository with correct values', async () => {
      const updateSpy = jest.spyOn(payableRepository, 'update')
      await sut.update({
        id: 'any_id',
        data: {
          valueInCents: 10000
        }
      })
      expect(updateSpy).toHaveBeenCalledWith('any_id',{
        valueInCents: 10000
      })
    });

    it('should return a entity on success', async () => {
      const result = await sut.update({
        id: 'any_id',
        data: {
          valueInCents: 10000
        }
      })
      expect(result).toEqual(makeFakePayable())
    });
  });

  describe('remove', () => {
    it('should call repository.findOne with correct values', async () => {
      const findOneSpy = jest.spyOn(payableRepository, 'findOne')

      await sut.remove({
        id: 'any_id'
      })

      expect(findOneSpy).toHaveBeenCalledWith({
        where: {
          id: 'any_id',
          deletedAt: null
        }
      })
    });

    it('should throw if payable already exists', async () => {
      jest.spyOn(payableRepository, 'findOne').mockResolvedValueOnce(null)

      const promise = sut.remove({
        id: 'any_id'
      })

      await expect(promise).rejects.toThrowError(new UnauthorizedException('Payable not found'))
    });

    it('should call repository with correct values', async () => {
      const removeSpy = jest.spyOn(payableRepository, 'remove')
      await sut.remove({
        id: 'any_id'
      })
      expect(removeSpy).toHaveBeenCalledWith('any_id')
    });
  });
});
 